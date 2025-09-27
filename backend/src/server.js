require('dotenv').config();
const pino = require('pino');

const app = require('./app');
const prisma = require('./config/prisma');

const logger = pino({ name: 'interview-backend' });
const PORT = process.env.PORT || 4000;

async function start() {
    try {
        await prisma.$connect();
        app.listen(PORT, () => {
            logger.info(`Server listening on port ${PORT}`);
        });
    } catch (error) {
        logger.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}

start();

process.on('SIGINT', async () => {
    logger.info('Shutting down server (SIGINT)');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down server (SIGTERM)');
    await prisma.$disconnect();
    process.exit(0);
});
