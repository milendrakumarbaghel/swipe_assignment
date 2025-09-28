const prisma = require('../config/prisma');
const { easyQuestions, mediumQuestions, hardQuestions } = require('../utils/questionBank');
const { difficultyOrder } = require('../utils/interviewConfig');
const { DEFAULT_FOCUS_TOPICS } = require('../utils/resumeInsights');
const { isAIEnabled, generateQuestion } = require('./aiService');

const byDifficulty = {
    EASY: easyQuestions,
    MEDIUM: mediumQuestions,
    HARD: hardQuestions,
};

function buildFocusHints(resumeInsights) {
    const focusAreas = Array.isArray(resumeInsights?.focusAreas)
        ? resumeInsights.focusAreas.filter((item) => item && (item.topic || item.reason))
        : [];

    if (focusAreas.length) {
        return focusAreas.slice(0, 8);
    }

    // Use enhanced insights from AI analysis
    const hints = [];

    // Create focus hints from unique details
    if (Array.isArray(resumeInsights?.uniqueDetails)) {
        resumeInsights.uniqueDetails.slice(0, 3).forEach((detail) => {
            hints.push({
                topic: `Experience with ${detail}`,
                reason: `Ask about specific challenges and solutions from their ${detail} experience.`,
            });
        });
    }

    // Create focus hints from project types
    if (Array.isArray(resumeInsights?.projectTypes)) {
        resumeInsights.projectTypes.slice(0, 2).forEach((projectType) => {
            hints.push({
                topic: `${projectType} development`,
                reason: `Probe deeper into their ${projectType} architecture and implementation decisions.`,
            });
        });
    }

    // Add industry-specific questions if we have industry context
    if (resumeInsights?.industryContext) {
        hints.push({
            topic: `Domain expertise in ${resumeInsights.industryContext}`,
            reason: `Explore how they apply technical skills to solve ${resumeInsights.industryContext} domain problems.`,
        });
    }

    // Fall back to skill-based hints if we have skills
    if (Array.isArray(resumeInsights?.skills) && resumeInsights.skills.length && hints.length < 4) {
        resumeInsights.skills.slice(0, 6 - hints.length).forEach((skill) => {
            hints.push({
                topic: skill,
                reason: `Resume highlights ${skill}; explore applied experience and best practices.`,
            });
        });
    }

    // Final fallback to default topics
    if (hints.length === 0) {
        return DEFAULT_FOCUS_TOPICS.slice(0, 6);
    }

    return hints.slice(0, 6);
}

function matchesFocusTarget(value, focusLower) {
    return typeof value === 'string' && value.toLowerCase().includes(focusLower);
}

async function ensureTemplatesForDifficulty(difficulty) {
    const desiredCount = difficultyOrder.filter((level) => level === difficulty).length;
    const existing = await prisma.questionTemplate.findMany({
        where: { difficulty },
    });

    if (existing.length >= desiredCount) {
        return existing;
    }

    const fallbacks = byDifficulty[difficulty] || [];
    const toCreate = fallbacks.slice(0, desiredCount - existing.length);

    if (!toCreate.length) {
        return existing;
    }

    const created = await Promise.all(
        toCreate.map((item) =>
            prisma.questionTemplate.create({
                data: {
                    difficulty,
                    prompt: item.prompt,
                    expectedNote: item.expected,
                    category: 'fullstack',
                },
            })
        )
    );

    return existing.concat(created);
}

async function generateQuestionsForSession(session, { resumeText, resumeInsights } = {}) {
    const sessionId = session.id;
    const candidateName = session?.candidate?.name;
    const grouped = {
        EASY: [],
        MEDIUM: [],
        HARD: [],
    };

    await Promise.all(
        Object.keys(grouped).map(async (difficulty) => {
            grouped[difficulty] = await ensureTemplatesForDifficulty(difficulty);
        })
    );

    const usageTracker = {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0,
    };

    Object.keys(usageTracker).forEach((difficulty) => {
        const templates = grouped[difficulty];
        const bank = byDifficulty[difficulty] || [];
        const poolLength = templates.length || bank.length;
        if (poolLength > 0) {
            usageTracker[difficulty] = Math.floor(Math.random() * poolLength);
        }
    });

    const focusHints = buildFocusHints(resumeInsights);
    const shuffledFocusHints = focusHints.length ? [...focusHints].sort(() => Math.random() - 0.5) : [];
    const usedTemplateIds = new Set();
    const usedFallbackPrompts = new Set();

    const selectTemplateForDifficulty = (templates, difficulty, focusHint, askedTopicsRef) => {
        if (!templates.length) {
            return null;
        }

        const focusLower = focusHint?.topic ? focusHint.topic.toLowerCase() : null;
        const available = templates.filter((item) => !usedTemplateIds.has(item.id));
        const prioritized = available.length ? available : templates;

        const matchesAskedTopic = (item) => {
            const candidateTopics = [item.topic, item.prompt, item.expectedNote]
                .filter(Boolean)
                .map((value) => value.toLowerCase());
            return candidateTopics.some((candidate) =>
                askedTopicsRef.some((asked) => asked.toLowerCase() === candidate)
            );
        };

        let template = null;

        if (focusLower) {
            template = prioritized.find(
                (item) =>
                    matchesFocusTarget(item.prompt, focusLower) ||
                    matchesFocusTarget(item.expectedNote, focusLower) ||
                    (item.topic && item.topic.toLowerCase() === focusLower)
            );
        }

        if (!template) {
            template = prioritized.find((item) => !matchesAskedTopic(item));
        }

        if (!template) {
            const pointer = usageTracker[difficulty] % prioritized.length;
            template = prioritized[pointer];
        }

        usageTracker[difficulty] += 1;
        usedTemplateIds.add(template.id);
        return template;
    };

    const selectBankQuestion = (bank, difficulty, focusHint, askedTopicsRef) => {
        if (!bank.length) {
            return null;
        }

        const focusLower = focusHint?.topic ? focusHint.topic.toLowerCase() : null;
        const available = bank.filter((item) => !usedFallbackPrompts.has(item.prompt));
        const prioritized = available.length ? available : bank;
        const skills = Array.isArray(resumeInsights?.skills)
            ? resumeInsights.skills.map((skill) => skill.toLowerCase())
            : [];

        const matchesAskedTopic = (item) => {
            const candidateTopics = [item.topic, item.prompt, item.expected]
                .filter(Boolean)
                .map((value) => value.toLowerCase());
            return candidateTopics.some((candidate) =>
                askedTopicsRef.some((asked) => asked.toLowerCase() === candidate)
            );
        };

        let fallback = null;

        if (focusLower) {
            fallback = prioritized.find(
                (item) =>
                    matchesFocusTarget(item.topic, focusLower) ||
                    matchesFocusTarget(item.prompt, focusLower) ||
                    matchesFocusTarget(item.expected, focusLower)
            );
        }

        if (!fallback && skills.length) {
            fallback = prioritized.find((item) =>
                skills.some(
                    (skill) =>
                        matchesFocusTarget(item.topic, skill) ||
                        matchesFocusTarget(item.prompt, skill) ||
                        matchesFocusTarget(item.expected, skill)
                )
            );
        }

        if (!fallback) {
            fallback = prioritized.find((item) => !matchesAskedTopic(item));
        }

        if (!fallback) {
            const pointer = usageTracker[difficulty] % prioritized.length;
            fallback = prioritized[pointer];
        }

        usageTracker[difficulty] += 1;
        usedFallbackPrompts.add(fallback.prompt);
        return fallback;
    };

    const askedTopics = [];
    const createdQuestions = [];

    for (let index = 0; index < difficultyOrder.length; index += 1) {
        const difficulty = difficultyOrder[index];
        let questionRecord = null;
        const focusHint = shuffledFocusHints.length ? shuffledFocusHints[index % shuffledFocusHints.length] : null;

        if (isAIEnabled()) {
            let aiAttempts = 0;
            const maxAttempts = 2;

            while (aiAttempts < maxAttempts && !questionRecord) {
                try {
                    const aiQuestion = await generateQuestion({
                        difficulty,
                        resumeText,
                        askedTopics,
                        candidateName,
                        resumeInsights,
                        targetFocus: focusHint,
                    });

                    questionRecord = await prisma.interviewQuestion.create({
                        data: {
                            sessionId,
                            order: index,
                            difficulty,
                            prompt: aiQuestion.prompt,
                            expectedNote: aiQuestion.expectedNote,
                        },
                    });

                    if (aiQuestion.topic) {
                        askedTopics.push(aiQuestion.topic);
                    } else if (focusHint?.topic) {
                        askedTopics.push(focusHint.topic);
                    } else {
                        askedTopics.push(aiQuestion.prompt.slice(0, 80));
                    }

                    // Log successful personalization for debugging
                    if (aiQuestion.personalization) {
                        console.log(`Generated personalized question for ${difficulty}: ${aiQuestion.personalization}`);
                    }

                    break; // Success, exit retry loop
                } catch (error) {
                    aiAttempts++;
                    console.warn(`AI question generation attempt ${aiAttempts} failed for ${difficulty}: ${error.message}`);
                    if (aiAttempts >= maxAttempts) {
                        console.warn(`Failed to generate AI question after ${maxAttempts} attempts, falling back to template/bank`);
                    }
                }
            }
        }

        if (!questionRecord) {
            const templates = grouped[difficulty];
            const bank = byDifficulty[difficulty] || [];

            if (templates.length) {
                const template = selectTemplateForDifficulty(templates, difficulty, focusHint, askedTopics);
                if (template) {
                    questionRecord = await prisma.interviewQuestion.create({
                        data: {
                            sessionId,
                            order: index,
                            difficulty,
                            prompt: template.prompt,
                            templateId: template.id,
                            expectedNote: template.expectedNote || template.expected,
                        },
                    });

                    const topicForQuestion = template.topic || focusHint?.topic || template.prompt.slice(0, 80);
                    askedTopics.push(topicForQuestion);
                }
            }

            if (!questionRecord) {
                const fallback = selectBankQuestion(bank, difficulty, focusHint, askedTopics);
                if (fallback) {
                    questionRecord = await prisma.interviewQuestion.create({
                        data: {
                            sessionId,
                            order: index,
                            difficulty,
                            prompt: fallback.prompt,
                            expectedNote: fallback.expected,
                        },
                    });

                    const topicForQuestion = fallback.topic
                        ? fallback.topic
                        : focusHint?.topic && matchesFocusTarget(fallback.prompt, focusHint.topic.toLowerCase())
                            ? focusHint.topic
                            : fallback.prompt.slice(0, 80);

                    askedTopics.push(topicForQuestion);
                }
            }

            if (!questionRecord) {
                throw new Error(`No questions available for difficulty ${difficulty}`);
            }
        }

        createdQuestions.push(questionRecord);
    }

    return createdQuestions;
}

module.exports = {
    generateQuestionsForSession,
};
