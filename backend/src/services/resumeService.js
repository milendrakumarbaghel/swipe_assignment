const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { deriveResumeInsights } = require('../utils/resumeInsights');

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_REGEX = /(\+\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/;

async function extractTextFromPdf(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const { text } = await pdfParse(dataBuffer);
    return text;
}

async function extractTextFromDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

function extractName(text) {
    if (!text) return null;
    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length);
    if (!lines.length) {
        return null;
    }
    const likelyName = lines[0];
    if (likelyName.length > 60 || /@|\d/.test(likelyName)) {
        return null;
    }
    return likelyName;
}

function extractEmail(text) {
    if (!text) return null;
    const match = text.match(EMAIL_REGEX);
    return match ? match[0] : null;
}

function extractPhone(text) {
    if (!text) return null;
    const match = text.match(PHONE_REGEX);
    if (!match) return null;
    return match[0].replace(/\s+/g, ' ').trim();
}

async function extractResumeData({ filePath, mimetype }) {
    let text = '';
    if (mimetype === 'application/pdf') {
        text = await extractTextFromPdf(filePath);
    } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword'
    ) {
        text = await extractTextFromDocx(filePath);
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX resume.');
    }

    const name = extractName(text);
    const email = extractEmail(text);
    const phone = extractPhone(text);

    return {
        text,
        candidate: {
            name,
            email,
            phone,
        },
        insights: deriveResumeInsights(text),
    };
}

async function cleanupFile(filePath) {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        // Ignore missing file errors
        if (error.code !== 'ENOENT') {
            // eslint-disable-next-line no-console
            console.warn(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }
}

function buildStoredPath(filePath) {
    const filename = path.basename(filePath);
    return `/uploads/${filename}`;
}

module.exports = {
    extractResumeData,
    cleanupFile,
    buildStoredPath,
};
