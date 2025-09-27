const { validationResult } = require('express-validator');
const {
    extractResumeData,
    cleanupFile,
    buildStoredPath,
} = require('../services/resumeService');

async function uploadResume(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Resume upload validation failed',
                errors: errors.array(),
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Resume file is required.' });
        }

        const { path: filePath, mimetype, originalname, filename } = req.file;

        const parsed = await extractResumeData({ filePath, mimetype });

        return res.status(200).json({
            message: 'Resume processed successfully',
            candidate: parsed.candidate,
            resume: {
                originalName: originalname,
                storedFileName: filename,
                url: buildStoredPath(filePath),
                mimetype,
            },
            resumeText: parsed.text,
        });
    } catch (error) {
        if (req.file) {
            await cleanupFile(req.file.path);
        }
        return next(error);
    }
}

module.exports = {
    uploadResume,
};
