const difficultyWeights = {
    EASY: { base: 6, keywordsBonus: 3, lengthBonus: 1 },
    MEDIUM: { base: 5, keywordsBonus: 4, lengthBonus: 1 },
    HARD: { base: 4, keywordsBonus: 5, lengthBonus: 1 },
};

function tokenize(text) {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
}

function extractKeywords(expectedNote = '') {
    const tokens = tokenize(expectedNote);
    return Array.from(new Set(tokens.filter((word) => word.length > 3)));
}

function calculateScore(answerText, expectedNote, difficulty, timeTakenSeconds, timeLimitSeconds) {
    if (!answerText || !answerText.trim()) {
        return {
            score: 0,
            feedback: 'No substantial answer was provided.',
            strengths: undefined,
            improvements: ['Provide a more complete response.'],
            source: 'heuristic',
            model: null,
        };
    }

    const diffConfig = difficultyWeights[difficulty] || difficultyWeights.EASY;
    const tokens = tokenize(answerText);
    const uniqueTokens = new Set(tokens);
    const keywords = extractKeywords(expectedNote);
    const matchedKeywords = keywords.filter((keyword) => uniqueTokens.has(keyword));

    let score = diffConfig.base;

    if (matchedKeywords.length) {
        const coverage = matchedKeywords.length / Math.max(keywords.length, 1);
        score += diffConfig.keywordsBonus * Math.min(1, coverage + 0.2);
    }

    if (tokens.length > 40) {
        score += diffConfig.lengthBonus;
    }

    // Deduct for running out of time by large margin
    if (timeLimitSeconds && timeTakenSeconds > timeLimitSeconds) {
        score -= 1;
    }

    score = Math.max(0, Math.min(10, Number(score.toFixed(2))));

    const feedbackParts = [];
    const strengths = [];
    const improvements = [];

    if (matchedKeywords.length) {
        feedbackParts.push(
            `Good coverage of key topics (${matchedKeywords.slice(0, 5).join(', ')}).`
        );
        strengths.push(`Covered key topics: ${matchedKeywords.slice(0, 5).join(', ')}`);
    } else if (keywords.length) {
        feedbackParts.push('Consider addressing core keywords highlighted in the question.');
        improvements.push(`Incorporate keywords such as ${keywords.slice(0, 5).join(', ')}`);
    }

    if (tokens.length < 25) {
        feedbackParts.push('Answer could include more depth or examples.');
        improvements.push('Add more depth or concrete examples.');
    } else if (tokens.length > 60) {
        strengths.push('Provided an in-depth and thorough response.');
    }

    if (timeTakenSeconds > timeLimitSeconds) {
        feedbackParts.push('Answer exceeded the recommended time limit.');
        improvements.push('Stay within the recommended time limit.');
    }

    if (!feedbackParts.length) {
        feedbackParts.push('Solid answer with well-structured explanation.');
        strengths.push('Answer was well structured and comprehensive.');
    }

    return {
        score,
        feedback: feedbackParts.join(' '),
        strengths: strengths.length ? strengths : undefined,
        improvements: improvements.length ? improvements : undefined,
        source: 'heuristic',
        model: null,
    };
}

module.exports = {
    calculateScore,
};
