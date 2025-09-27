const prisma = require('../config/prisma');
const { generateQuestionsForSession } = require('./questionService');
const { calculateScore } = require('../utils/scoring');
const { timeLimits, difficultyOrder } = require('../utils/interviewConfig');
const { buildSummary } = require('../utils/summary');

async function startInterview({ candidate, resume, resumeText }) {
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

  const questions = await generateQuestionsForSession(session.id);

  const firstQuestion = questions.find((question) => question.order === 0);

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      sender: 'SYSTEM',
      content: 'Interview started. You will be asked six questions ranging from easy to hard difficulty.',
      meta: resumeText ? { resumeSummary: resumeText.slice(0, 500) } : undefined,
    },
  });

  if (firstQuestion) {
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'AI',
        content: firstQuestion.prompt,
        meta: { difficulty: firstQuestion.difficulty, order: firstQuestion.order },
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
      meta: { difficulty: question.difficulty, order: question.order },
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

  if (question.order !== session.currentQuestionIndex) {
    const error = new Error('Question order mismatch.');
    error.status = 400;
    throw error;
  }

  const timeLimit = timeLimits[question.difficulty] || 60;
  const evaluation = calculateScore(
    answerText,
    question.expectedNote,
    question.difficulty,
    timeTakenSeconds,
    timeLimit
  );

  const answer = await prisma.candidateAnswer.create({
    data: {
      questionId: question.id,
      sessionId,
      responseText: answerText,
      timeTakenSeconds,
      autoSubmitted,
      score: evaluation.score,
      aiFeedback: evaluation.feedback,
    },
  });

  await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'INTERVIEWEE',
      content: answerText || '(no answer provided)',
      meta: {
        questionId: question.id,
        timeTakenSeconds,
        autoSubmitted,
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

  const scores = session.questions.map((question) => {
    const answer = session.answers.find((ans) => ans.questionId === question.id);
    return {
      question,
      score: answer?.score || 0,
    };
  });

  const answeredScores = scores.filter((item) => item.score !== null);
  const finalScore =
    answeredScores.reduce((total, item) => total + item.score, 0) /
    Math.max(answeredScores.length, 1);

  const summary = buildSummary({ candidate: session.candidate, scores: scores });

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
    },
  });

  return getSessionById(sessionId);
}

async function listCandidates({ search = '', sortField = 'updatedAt', sortOrder = 'desc' }) {
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
