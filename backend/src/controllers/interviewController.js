const { validationResult } = require('express-validator');
const {
  startInterview,
  submitAnswer,
  finalizeSession,
  getSessionById,
} = require('../services/interviewService');

async function handleStartInterview(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid interview start payload',
        errors: errors.array(),
      });
    }

    const session = await startInterview(req.body);
    return res.status(201).json({
      message: 'Interview session created',
      session,
    });
  } catch (error) {
    return next(error);
  }
}

async function handleSubmitAnswer(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid answer payload',
        errors: errors.array(),
      });
    }

    const { id: sessionId } = req.params;
    const result = await submitAnswer({
      sessionId,
      questionId: req.body.questionId,
      answerText: req.body.answerText,
      timeTakenSeconds: req.body.timeTakenSeconds,
      autoSubmitted: req.body.autoSubmitted,
    });

    return res.status(200).json({
      message: 'Answer recorded',
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

async function handleGetSession(req, res, next) {
  try {
    const session = await getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    return res.status(200).json({ session });
  } catch (error) {
    return next(error);
  }
}

async function handleFinalizeSession(req, res, next) {
  try {
    const session = await finalizeSession(req.params.id);
    return res.status(200).json({
      message: 'Session finalized',
      session,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  handleStartInterview,
  handleSubmitAnswer,
  handleGetSession,
  handleFinalizeSession,
};
