const express = require('express');
const { handleListCandidates, handleGetCandidate } = require('../controllers/candidateController');

const router = express.Router();

router.get('/', handleListCandidates);
router.get('/:id', handleGetCandidate);

module.exports = router;
