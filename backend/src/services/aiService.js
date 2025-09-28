const OpenAI = require('openai');

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
let client;

class AIUnavailableError extends Error {
    constructor(message = 'AI provider is not configured') {
        super(message);
        this.name = 'AIUnavailableError';
        this.code = 'AI_UNAVAILABLE';
    }
}

function isAIEnabled() {
    return Boolean(process.env.OPENAI_API_KEY);
}

function getClient() {
    if (!isAIEnabled()) {
        return null;
    }
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

async function createJsonResponse(messages, { maxOutputTokens = 400 } = {}) {
    const aiClient = getClient();
    if (!aiClient) {
        throw new AIUnavailableError();
    }

    const normalizedMessages = messages.map((message) => ({
        role: message.role,
        content: typeof message.content === 'string' ? message.content :
            Array.isArray(message.content) ? message.content.map(c =>
                typeof c === 'string' ? c : c.text || c.content || ''
            ).join('\n') : String(message.content || '')
    }));

    const response = await aiClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: normalizedMessages,
        max_tokens: maxOutputTokens,
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const text = response.choices?.[0]?.message?.content || '';

    if (!text.trim()) {
        throw new Error('AI response did not include textual output');
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Failed to parse AI response as JSON: ${error.message}\nRaw: ${text}`);
    }
}

function clampScore(score) {
    if (Number.isNaN(Number(score))) {
        return 0;
    }
    return Math.max(0, Math.min(10, Number(score)));
}

function truncateText(text, maxLength = 1500) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
}

function normalizeArray(value) {
    if (!value) return undefined;
    if (Array.isArray(value)) {
        const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
        return cleaned.length ? cleaned : undefined;
    }
    if (typeof value === 'string') {
        const parts = value
            .split(/[\n,;-]+/)
            .map((item) => item.trim())
            .filter(Boolean);
        return parts.length ? parts : undefined;
    }
    return undefined;
}

async function generateQuestion({ difficulty, resumeText, askedTopics = [], candidateName, resumeInsights }) {
    const systemPrompt = `You are an expert technical interviewer for a senior full-stack role (React + Node).

CRITICAL: You must analyze the candidate's resume thoroughly and generate questions that are SPECIFICALLY tailored to their unique background, projects, companies, and experiences. Each question should be different and personalized based on the resume content.

Guidelines:
- Reference specific technologies, projects, or companies mentioned in the resume
- Ask about challenges they likely faced in their specific roles
- Probe deeper into their most relevant experiences
- Make questions unique to their career path and expertise level
- Connect the difficulty level to their apparent experience level`;

    const resumeHighlights = [];
    if (resumeInsights?.highlights?.length) {
        resumeHighlights.push(`Resume Highlights:\n- ${resumeInsights.highlights.join('\n- ')}`);
    }
    if (resumeInsights?.skills?.length) {
        resumeHighlights.push(`Technical Skills: ${resumeInsights.skills.join(', ')}`);
    }
    if (resumeInsights?.roles?.length) {
        resumeHighlights.push(`Career Roles: ${resumeInsights.roles.join(', ')}`);
    }
    if (resumeInsights?.experienceYears) {
        resumeHighlights.push(`Experience Level: ~${resumeInsights.experienceYears} years`);
    }
    if (Array.isArray(resumeInsights?.focusAreas) && resumeInsights.focusAreas.length) {
        resumeHighlights.push(
            `Focus Areas to Explore:\n- ${resumeInsights.focusAreas
                .map((area) => `${area.topic || 'Topic'}${area.reason ? ` (${area.reason})` : ''}`)
                .join('\n- ')}`
        );
    }

    const personalizedContext = resumeHighlights.length
        ? `Resume Analysis:\n${resumeHighlights.join('\n')}`
        : 'Resume Analysis: Limited insights available';

    const candidateLine = candidateName ? `Candidate: ${candidateName}` : 'Candidate: Name not provided';

    // Extract key details from resume for better personalization
    const extractKeyDetails = (text) => {
        if (!text) return '';

        // Extract company names (look for patterns like "at Company" or "Company, Inc")
        const companyMatches = text.match(/(?:at\s+|@\s+)([A-Z][a-zA-Z\s&,.-]+(?:Inc|Corp|LLC|Ltd|Company|Co\.|Technologies|Tech|Software|Systems|Solutions)?)/gi);
        const companies = companyMatches ? companyMatches.slice(0, 3).map(m => m.replace(/^(?:at\s+|@\s+)/i, '').trim()) : [];

        // Extract project keywords
        const projectKeywords = [];
        if (text.toLowerCase().includes('project')) {
            const projectMatches = text.match(/(?:project|built|developed|created|implemented)\s+([a-zA-Z\s-]+)/gi);
            if (projectMatches) projectKeywords.push(...projectMatches.slice(0, 3));
        }

        // Extract specific technologies beyond the basic skill detection
        const techMatches = text.match(/(?:using|with|in)\s+([A-Za-z0-9\s,.-]+(?:js|JS|typescript|python|java|react|angular|vue|node|express|mongodb|postgresql|aws|azure|gcp|docker|kubernetes))/gi);
        const specificTech = techMatches ? techMatches.slice(0, 3) : [];

        let details = '';
        if (companies.length) details += `Companies: ${companies.join(', ')}\n`;
        if (projectKeywords.length) details += `Project Experience: ${projectKeywords.join('; ')}\n`;
        if (specificTech.length) details += `Technology Context: ${specificTech.join('; ')}\n`;

        return details;
    };

    const keyDetails = extractKeyDetails(resumeText);
    const avoidedTopics = askedTopics.length > 0 ? `\n\nAVOID these topics already covered: ${askedTopics.join(', ')}` : '';

    const request = {
        role: 'user',
        content: `${candidateLine}

TASK: Generate ONE unique ${difficulty.toLowerCase()}-level interview question specifically tailored to this candidate's background.

REQUIREMENTS:
- Question MUST be personalized to their specific resume content
- Reference their actual companies, projects, or technologies when possible
- Ask about real challenges they likely faced in their roles
- Make the question unique to their career path
- Ensure the question is appropriate for a ${difficulty.toLowerCase()} difficulty level
${avoidedTopics}

${personalizedContext}

KEY RESUME DETAILS:
${keyDetails}

FULL RESUME TEXT:
${truncateText(resumeText, 3000)}

Return JSON with:
- prompt: The personalized interview question
- rubric: Key points the answer should cover (as array or string)
- topic: Brief topic label for tracking
- personalization: Brief note on how this question relates to their background`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ], { maxOutputTokens: 500 });

    if (!result.prompt) {
        throw new Error('AI question response missing prompt field');
    }

    const rubricItems = normalizeArray(result.rubric || result.focusPoints);

    return {
        prompt: String(result.prompt).trim(),
        expectedNote: rubricItems ? rubricItems.join('\n') : String(result.rubric || '').trim(),
        topic: result.topic ? String(result.topic) : undefined,
        personalization: result.personalization ? String(result.personalization) : undefined,
    };
}

async function evaluateAnswer({ questionPrompt, expectedNote, answerText, difficulty }) {
    const systemPrompt = 'You are an impartial technical interviewer. Score answers from 0.0 to 10.0 using half-point precision.';
    const request = {
        role: 'user',
        content: `Question (difficulty ${difficulty}): ${questionPrompt}
Ideal focus points: ${expectedNote || 'N/A'}
Candidate answer: ${answerText || '(empty)'}

Return JSON with:
- score: 0-10 numeric
- feedback: constructive critique (2-3 sentences)
- keyStrengths: optional array of phrases
- improvements: optional array of suggestions`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ]);

    const score = clampScore(result.score);
    const feedback = result.feedback ? String(result.feedback).trim() : 'Feedback unavailable.';
    const strengths = normalizeArray(result.keyStrengths || result.strengths);
    const improvements = normalizeArray(result.improvements || result.gaps);

    return {
        score,
        feedback,
        strengths,
        improvements,
        source: 'ai',
        model: DEFAULT_MODEL,
    };
}

async function summarizeCandidate({ candidate, answers }) {
    const systemPrompt = 'You are preparing a concise interviewer debrief.';
    const answerSummaries = answers
        .map(
            (item, index) => `Q${index + 1} (${item.difficulty}): ${item.questionPrompt}\nScore: ${item.score}\nAnswer: ${item.answerText || '(no answer)'}\nAI feedback: ${item.feedback}`
        )
        .join('\n\n');

    const request = {
        role: 'user',
        content: `Candidate: ${candidate.name || 'Unknown'} (${candidate.email || 'N/A'})
Review the interview answers and produce JSON with:
  - summary (string): 3-4 sentences highlighting strengths, technical depth, and concerns.
  - recommendation (string): one of "Hire", "Hold", or "Decline".

Interview details:
${answerSummaries}`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ], { maxOutputTokens: 300 });

    const summaryText =
        typeof result.summary === 'string' && result.summary.trim()
            ? result.summary.trim()
            : null;
    const recommendation =
        typeof result.recommendation === 'string' && result.recommendation.trim()
            ? result.recommendation.trim()
            : null;

    if (!summaryText && typeof result === 'string' && result.trim()) {
        return result.trim();
    }

    if (!summaryText) {
        throw new Error('AI summary response missing summary text');
    }

    if (recommendation) {
        return `${summaryText}\n\nRecommendation: ${recommendation}`;
    }

    return summaryText;
}

async function summarizeResumeForInterview(resumeText) {
    if (!resumeText) {
        return null;
    }

    const systemPrompt = `You are preparing detailed interview context from a candidate resume for a senior full-stack interview.

Focus on extracting specific, unique details that will help generate personalized interview questions. Pay attention to:
- Specific companies, projects, and technologies they've worked with
- Unique challenges they likely faced in their roles
- Industry/domain expertise they've gained
- Leadership and impact indicators
- Notable achievements or scale of their work`;

    const request = {
        role: 'user',
        content: `Analyze this resume thoroughly and return JSON with:

- highlights: Array of 4-5 specific accomplishments or experiences (not generic skills)
- skills: Array of key technologies/tools mentioned (max 12)
- roles: Array of specific job titles and companies (max 6)
- experienceYears: Estimated total years of professional experience
- focusAreas: Array of 5-6 interview topics personalized to their background, each as { topic: string, reason: string }
- uniqueDetails: Array of 3-4 specific details that make this candidate unique (companies, projects, domains, scale)
- industryContext: Brief description of industries/domains they have experience in
- projectTypes: Array of types of projects they've built (e.g., "e-commerce platforms", "real-time dashboards")

Be specific and detailed. Extract actual company names, project types, and concrete experiences.

Resume text:
${truncateText(resumeText, 5000)}`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ], { maxOutputTokens: 600 });

    const normalizeArrayOfStrings = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map((item) => String(item).trim()).filter(Boolean);
        }
        return String(value)
            .split(/\n|,|;/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    return {
        highlights: normalizeArrayOfStrings(result.highlights),
        skills: normalizeArrayOfStrings(result.skills),
        roles: normalizeArrayOfStrings(result.roles),
        uniqueDetails: normalizeArrayOfStrings(result.uniqueDetails || []),
        industryContext: result.industryContext ? String(result.industryContext).trim() : null,
        projectTypes: normalizeArrayOfStrings(result.projectTypes || []),
        focusAreas: Array.isArray(result.focusAreas)
            ? result.focusAreas
                .map((item) =>
                    item && typeof item === 'object'
                        ? {
                            topic: item.topic ? String(item.topic).trim() : undefined,
                            reason: item.reason ? String(item.reason).trim() : undefined,
                        }
                        : null
                )
                .filter((item) => item && (item.topic || item.reason))
            : [],
        experienceYears: result.experienceYears ? Number(result.experienceYears) : null,
    };
}

module.exports = {
    isAIEnabled,
    AIUnavailableError,
    generateQuestion,
    evaluateAnswer,
    summarizeCandidate,
    summarizeResumeForInterview,
};
