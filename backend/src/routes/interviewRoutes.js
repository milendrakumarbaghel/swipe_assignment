const express = require('express');
const { body } = require('express-validator');
const {
    handleStartInterview,
    handleSubmitAnswer,
    handleGetSession,
    handleFinalizeSession,
} = require('../controllers/interviewController');

const router = express.Router();

router.post(
    '/',
    [
        body('candidate.name').trim().notEmpty().withMessage('Candidate name is required.'),
        body('candidate.email').isEmail().withMessage('Valid candidate email is required.'),
        body('candidate.phone').trim().notEmpty().withMessage('Candidate phone is required.'),
        body('resume.url').optional().isString(),
        body('resume.originalName').optional().isString(),
        body('resumeText').optional().isString(),
    ],
    handleStartInterview
);

router.get('/:id', handleGetSession);

router.post(
    '/:id/answers',
    [
        body('questionId').isString().withMessage('Question ID is required.'),
        body('timeTakenSeconds').isInt({ min: 0 }).withMessage('Time taken must be a positive integer.'),
        body('answerText').optional().isString(),
        body('autoSubmitted').optional().isBoolean(),
    ],
    handleSubmitAnswer
);

router.post('/:id/finish', handleFinalizeSession);

module.exports = router;
