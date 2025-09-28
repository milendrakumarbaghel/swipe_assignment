const prisma = require('../config/prisma');
const { easyQuestions, mediumQuestions, hardQuestions } = require('../utils/questionBank');
const { difficultyOrder } = require('../utils/interviewConfig');
const { isAIEnabled, generateQuestion } = require('./aiService');

const byDifficulty = {
    EASY: easyQuestions,
    MEDIUM: mediumQuestions,
    HARD: hardQuestions,
};

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

async function generateQuestionsForSession(session, { resumeText } = {}) {
    const sessionId = session.id;
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

    const askedTopics = [];
    const createdQuestions = [];

    for (let index = 0; index < difficultyOrder.length; index += 1) {
        const difficulty = difficultyOrder[index];
        let questionRecord = null;

        if (isAIEnabled()) {
            try {
                const aiQuestion = await generateQuestion({
                    difficulty,
                    resumeText,
                    askedTopics,
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
                } else {
                    askedTopics.push(aiQuestion.prompt.slice(0, 80));
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn(`AI question generation failed for ${difficulty}: ${error.message}`);
            }
        }

        if (!questionRecord) {
            const templates = grouped[difficulty];
            const bank = byDifficulty[difficulty] || [];

            if (templates.length) {
                const pointer = usageTracker[difficulty] % templates.length;
                const template = templates[pointer];
                usageTracker[difficulty] += 1;

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

                askedTopics.push(template.topic || template.prompt.slice(0, 80));
            } else if (bank.length) {
                const pointer = usageTracker[difficulty] % bank.length;
                const fallback = bank[pointer];
                usageTracker[difficulty] += 1;

                questionRecord = await prisma.interviewQuestion.create({
                    data: {
                        sessionId,
                        order: index,
                        difficulty,
                        prompt: fallback.prompt,
                        expectedNote: fallback.expected,
                    },
                });

                askedTopics.push(fallback.topic || fallback.prompt.slice(0, 80));
            } else {
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
