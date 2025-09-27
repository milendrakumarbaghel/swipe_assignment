const express = require('express');

const resumeRoutes = require('./resumeRoutes');
const interviewRoutes = require('./interviewRoutes');
const candidateRoutes = require('./candidateRoutes');

const router = express.Router();

router.use('/resume', resumeRoutes);
router.use('/interviews', interviewRoutes);
router.use('/candidates', candidateRoutes);

module.exports = router;
