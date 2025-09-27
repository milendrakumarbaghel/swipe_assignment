const { listCandidates, getCandidateDetail } = require('../services/interviewService');

async function handleListCandidates(req, res, next) {
    try {
        const { search, sortField, sortOrder } = req.query;
        const candidates = await listCandidates({ search, sortField, sortOrder });
        return res.status(200).json({ candidates });
    } catch (error) {
        return next(error);
    }
}

async function handleGetCandidate(req, res, next) {
    try {
        const candidate = await getCandidateDetail(req.params.id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        return res.status(200).json({ candidate });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    handleListCandidates,
    handleGetCandidate,
};
