const prisma = require('../config/prisma');
const { generateQuestionsForSession } = require('./questionService');
const { calculateScore } = require('../utils/scoring');
const { timeLimits, difficultyOrder } = require('../utils/interviewConfig');
const { buildSummary } = require('../utils/summary');
const { deriveResumeInsights, mergeResumeInsights } = require('../utils/resumeInsights');
const {
    isAIEnabled,
    evaluateAnswer,
    summarizeCandidate,
    summarizeResumeForInterview,
} = require('./aiService');

async function startInterview({ candidate, resume, resumeText, resumeInsights: providedInsights }) {
    if (!candidate.email) {
        const error = new Error('Candidate email is required to start an interview.');
        error.status = 400;
        throw error;
    }

    const candidateRecord = await prisma.candidate.upsert({
        where: { email: candidate.email.toLowerCase() },
        update: {
            name: candidate.name,
            phone: candidate.phone,
            resumeUrl: resume?.url,
            resumeName: resume?.originalName,
        },
        create: {
            name: candidate.name,
            email: candidate.email.toLowerCase(),
            phone: candidate.phone,
            resumeUrl: resume?.url,
            resumeName: resume?.originalName,
        },
    });

    const session = await prisma.interviewSession.create({
        data: {
            candidateId: candidateRecord.id,
            status: 'ACTIVE',
            startedAt: new Date(),
            currentQuestionIndex: 0,
        },
        include: {
            candidate: true,
        },
    });

    const heuristicInsights = resumeText ? deriveResumeInsights(resumeText) : null;
    let resumeInsights = mergeResumeInsights(heuristicInsights, providedInsights);

    if (isAIEnabled() && resumeText) {
        try {
            const aiInsights = await summarizeResumeForInterview(resumeText);
            resumeInsights = mergeResumeInsights(resumeInsights, aiInsights);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`AI resume insights failed: ${error.message}`);
        }
    }

    const questions = await generateQuestionsForSession(session, {
        resumeText,
        resumeInsights,
    });

    const firstQuestion = questions.find((question) => question.order === 0);

    const systemMeta = { aiEnabled: isAIEnabled() };
    if (resumeText) {
        systemMeta.resumeSummary = resumeText.slice(0, 500);
    }
    if (resumeInsights) {
        systemMeta.resumeInsights = {
            highlights: resumeInsights.highlights,
            skills: resumeInsights.skills,
            roles: resumeInsights.roles,
            experienceYears: resumeInsights.experienceYears,
            focusAreas: resumeInsights.focusAreas,
            uniqueDetails: resumeInsights.uniqueDetails || [],
            projectTypes: resumeInsights.projectTypes || [],
            industryContext: resumeInsights.industryContext,
        };
    }

    await prisma.chatMessage.create({
        data: {
            sessionId: session.id,
            sender: 'SYSTEM',
            content: 'Interview started. You will be asked six questions ranging from easy to hard difficulty.',
            meta: Object.keys(systemMeta).length ? systemMeta : undefined,
        },
    });

    if (firstQuestion) {
        await prisma.chatMessage.create({
            data: {
                sessionId: session.id,
                sender: 'AI',
                content: firstQuestion.prompt,
                meta: {
                    difficulty: firstQuestion.difficulty,
                    order: firstQuestion.order,
                    aiSource: firstQuestion.templateId ? 'template' : 'ai',
                },
            },
        });
    }

    return getSessionById(session.id);
}

async function getSessionById(sessionId) {
    return prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
            candidate: true,
            questions: {
                orderBy: { order: 'asc' },
            },
            answers: {
                orderBy: { createdAt: 'asc' },
            },
            messages: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });
}

async function getNextQuestion(sessionId, index) {
    return prisma.interviewQuestion.findFirst({
        where: {
            sessionId,
            order: index,
        },
    });
}

async function recordQuestionMessage(sessionId, question) {
    if (!question) return;
    await prisma.chatMessage.create({
        data: {
            sessionId,
            sender: 'AI',
            content: question.prompt,
            meta: {
                difficulty: question.difficulty,
                order: question.order,
                aiSource: question.templateId ? 'template' : 'ai',
            },
        },
    });
}

async function submitAnswer({
    sessionId,
    questionId,
    answerText,
    timeTakenSeconds,
    autoSubmitted = false,
}) {
    const normalizedTime = Number(timeTakenSeconds) || 0;
    const normalizedAnswer = typeof answerText === 'string' ? answerText.trim() : '';
    const normalizedAutoSubmitted = Boolean(autoSubmitted);

    const session = await getSessionById(sessionId);
    if (!session) {
        const error = new Error('Interview session not found.');
        error.status = 404;
        throw error;
    }
    if (session.status !== 'ACTIVE') {
        const error = new Error('Interview session is not active.');
        error.status = 400;
        throw error;
    }

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) {
        const error = new Error('Question not found in session.');
        error.status = 404;
        throw error;
    }

    const existingAnswer = session.answers.find((ans) => ans.questionId === questionId);

    if (existingAnswer) {
        const updatedSession = await getSessionById(sessionId);
        const nextQuestion =
            updatedSession.status === 'COMPLETED'
                ? null
                : await getNextQuestion(sessionId, updatedSession.currentQuestionIndex);

        return {
            answer: existingAnswer,
            nextQuestion,
            session: updatedSession,
        };
    }

    if (question.order !== session.currentQuestionIndex) {
        const error = new Error('Question order mismatch.');
        error.status = 400;
        throw error;
    }

    const timeLimit = timeLimits[question.difficulty] || 60;
    let evaluation = null;
    let aiEvaluationError = null;

    if (isAIEnabled() && normalizedAnswer) {
        try {
            evaluation = await evaluateAnswer({
                questionPrompt: question.prompt,
                expectedNote: question.expectedNote,
                answerText: normalizedAnswer,
                difficulty: question.difficulty,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`AI evaluation failed: ${error.message}`);
            aiEvaluationError = error.message;
        }
    }

    if (!evaluation) {
        evaluation = calculateScore(
            normalizedAnswer,
            question.expectedNote,
            question.difficulty,
            normalizedTime,
            timeLimit
        );
        if (aiEvaluationError) {
            evaluation.aiError = aiEvaluationError;
        } else if (!isAIEnabled()) {
            evaluation.aiError = 'AI evaluation disabled; using rule-based scoring.';
        }
    }

    const answer = await prisma.candidateAnswer.create({
        data: {
            questionId: question.id,
            sessionId,
            responseText: normalizedAnswer,
            timeTakenSeconds: normalizedTime,
            autoSubmitted: normalizedAutoSubmitted,
            score: evaluation.score,
            aiFeedback: evaluation.feedback,
        },
    });

    await prisma.chatMessage.create({
        data: {
            sessionId,
            sender: 'INTERVIEWEE',
            content: normalizedAnswer || '(no answer provided)',
            meta: {
                questionId: question.id,
                timeTakenSeconds: normalizedTime,
                autoSubmitted: normalizedAutoSubmitted,
            },
        },
    });

    await prisma.chatMessage.create({
        data: {
            sessionId,
            sender: 'AI',
            content: evaluation.feedback,
            meta: {
                score: evaluation.score,
                questionId: question.id,
                strengths: evaluation.strengths,
                improvements: evaluation.improvements,
                aiSource: evaluation.source,
                aiModel: evaluation.model,
                aiError: evaluation.aiError,
            },
        },
    });

    const nextIndex = session.currentQuestionIndex + 1;
    const isLastQuestion = nextIndex >= difficultyOrder.length;

    let updatedSession = await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
            currentQuestionIndex: nextIndex,
            status: isLastQuestion ? 'COMPLETED' : 'ACTIVE',
            completedAt: isLastQuestion ? new Date() : session.completedAt,
        },
    });

    let nextQuestion = null;
    if (!isLastQuestion) {
        nextQuestion = await getNextQuestion(sessionId, nextIndex);
        await recordQuestionMessage(sessionId, nextQuestion);
        updatedSession = await getSessionById(sessionId);
    } else {
        await finalizeSession(sessionId);
        updatedSession = await getSessionById(sessionId);
    }

    return {
        answer,
        nextQuestion,
        session: updatedSession,
    };
}

async function finalizeSession(sessionId) {
    const session = await getSessionById(sessionId);
    if (!session) {
        const error = new Error('Interview session not found.');
        error.status = 404;
        throw error;
    }

    if (session.status === 'COMPLETED' && session.finalScore !== null) {
        return session;
    }

    const scores = session.questions.map((question) => {
        const answer = session.answers.find((ans) => ans.questionId === question.id);
        return {
            question,
            score: answer?.score || 0,
            answer,
        };
    });

    const answeredScores = scores.filter((item) => item.score !== null);
    const finalScore =
        answeredScores.reduce((total, item) => total + item.score, 0) /
        Math.max(answeredScores.length, 1);

    let summary = null;
    let summarySource = 'heuristic';
    let summaryError = null;

    if (isAIEnabled()) {
        try {
            summary = await summarizeCandidate({
                candidate: session.candidate,
                answers: scores.map((item) => ({
                    difficulty: item.question.difficulty,
                    questionPrompt: item.question.prompt,
                    score: item.score,
                    answerText: item.answer?.responseText,
                    feedback: item.answer?.aiFeedback,
                })),
            });
            summarySource = 'ai';
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`AI summary failed: ${error.message}`);
            summaryError = error.message;
        }
    }

    if (!summary) {
        summary = buildSummary({ candidate: session.candidate, scores });
        if (!summaryError && !isAIEnabled()) {
            summaryError = 'AI summarization disabled; using rule-based summary.';
        }
    }

    await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            finalScore,
            summary,
        },
    });

    await prisma.chatMessage.create({
        data: {
            sessionId,
            sender: 'SYSTEM',
            content: `Interview complete. Final score: ${finalScore.toFixed(1)}/10. Summary: ${summary}`,
            meta: {
                summarySource,
                aiError: summaryError,
            },
        },
    });

    return getSessionById(sessionId);
}

async function listCandidates({ search = '', sortField = 'finalScore', sortOrder = 'desc' }) {
    const orderByField = ['name', 'email', 'updatedAt', 'createdAt'].includes(sortField)
        ? sortField
        : 'updatedAt';

    const candidates = await prisma.candidate.findMany({
        where: {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        },
        include: {
            interviews: {
                orderBy: { createdAt: 'desc' },
            },
        },
        orderBy: [{ [orderByField]: sortOrder === 'asc' ? 'asc' : 'desc' }],
    });

    const enriched = candidates.map((candidate) => {
        const latestInterview = candidate.interviews[0];
        return {
            ...candidate,
            latestInterview,
        };
    });

    if (sortField === 'finalScore') {
        enriched.sort((a, b) => {
            const scoreA = a.latestInterview?.finalScore ?? -Infinity;
            const scoreB = b.latestInterview?.finalScore ?? -Infinity;
            return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        });
    }

    return enriched;
}

async function getCandidateDetail(candidateId) {
    return prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
            interviews: {
                orderBy: { createdAt: 'desc' },
                include: {
                    questions: { orderBy: { order: 'asc' } },
                    answers: true,
                    messages: { orderBy: { createdAt: 'asc' } },
                },
            },
        },
    });
}

module.exports = {
    startInterview,
    submitAnswer,
    finalizeSession,
    getSessionById,
    listCandidates,
    getCandidateDetail,
};
