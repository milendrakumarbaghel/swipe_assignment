const prisma = require('../config/prisma');
const { easyQuestions, mediumQuestions, hardQuestions } = require('../utils/questionBank');
const { difficultyOrder } = require('../utils/interviewConfig');

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
          category: 'fullstack',
        },
      })
    )
  );

  return existing.concat(created);
}

async function generateQuestionsForSession(sessionId) {
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

  const questions = [];
  const usageTracker = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };

  difficultyOrder.forEach((difficulty, index) => {
    const templates = grouped[difficulty];
    const pointer = usageTracker[difficulty] % templates.length;
    const template = templates[pointer];
    usageTracker[difficulty] += 1;

    questions.push(
      prisma.interviewQuestion.create({
        data: {
          sessionId,
          order: index,
          difficulty,
          prompt: template.prompt,
          templateId: template.id,
        },
      })
    );
  });

  return Promise.all(questions);
}

module.exports = {
  generateQuestionsForSession,
};
