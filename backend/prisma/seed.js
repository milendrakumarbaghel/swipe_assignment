const { PrismaClient } = require('@prisma/client');
const { easyQuestions, mediumQuestions, hardQuestions } = require('../src/utils/questionBank');

const prisma = new PrismaClient();

async function upsertTemplates(questions, difficulty) {
    await Promise.all(
        questions.map((question) =>
            prisma.questionTemplate.upsert({
                where: {
                    prompt_difficulty: {
                        prompt: question.prompt,
                        difficulty,
                    },
                },
                update: {
                    expectedNote: question.expected,
                },
                create: {
                    prompt: question.prompt,
                    difficulty,
                    expectedNote: question.expected,
                },
            })
        )
    );
}

async function main() {
    await upsertTemplates(easyQuestions, 'EASY');
    await upsertTemplates(mediumQuestions, 'MEDIUM');
    await upsertTemplates(hardQuestions, 'HARD');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
