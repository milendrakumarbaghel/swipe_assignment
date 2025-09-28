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

    const normalizedMessages = messages.map((message) => {
        const serializeText = (value) => ({ type: 'input_text', text: String(value ?? '') });

        if (typeof message.content === 'string') {
            return {
                role: message.role,
                content: [serializeText(message.content)],
            };
        }

        if (Array.isArray(message.content)) {
            const normalizedContent = message.content.map((item) => {
                if (item?.type && item.type !== 'text') {
                    return item;
                }
                return serializeText(item?.text ?? item?.content ?? '');
            });

            return {
                role: message.role,
                content: normalizedContent,
            };
        }

        return {
            role: message.role,
            content: [serializeText(message.content)],
        };
    });

    const response = await aiClient.responses.create({
        model: DEFAULT_MODEL,
        input: normalizedMessages,
        text: { format: 'json' },
        max_output_tokens: maxOutputTokens,
    });

    let text = typeof response.output_text === 'string' ? response.output_text : '';

    if (!text.trim() && Array.isArray(response.output)) {
        const chunks = [];
        response.output.forEach((item) => {
            if (Array.isArray(item.content)) {
                item.content.forEach((content) => {
                    if (typeof content.text === 'string') {
                        chunks.push(content.text);
                    }
                });
            }
        });
        text = chunks.join('').trim();
    }

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
    const systemPrompt = `You are an expert technical interviewer for a senior full-stack role (React + Node). You must craft high-quality interview questions following the requested difficulty.`;
    const resumeHighlights = [];
    if (resumeInsights?.highlights?.length) {
        resumeHighlights.push(`Highlights:\n- ${resumeInsights.highlights.join('\n- ')}`);
    }
    if (resumeInsights?.skills?.length) {
        resumeHighlights.push(`Key skills: ${resumeInsights.skills.join(', ')}`);
    }
    if (resumeInsights?.roles?.length) {
        resumeHighlights.push(`Previous roles: ${resumeInsights.roles.join(', ')}`);
    }
    if (Array.isArray(resumeInsights?.focusAreas) && resumeInsights.focusAreas.length) {
        resumeHighlights.push(
            `Recommended focus areas:\n- ${resumeInsights.focusAreas
                .map((area) => `${area.topic || 'Topic'}${area.reason ? ` (why: ${area.reason})` : ''}`)
                .join('\n- ')}`
        );
    }

    const personalizedContext = resumeHighlights.length
        ? `Personalized context:\n${resumeHighlights.join('\n')}`
        : 'Personalized context: (insufficient resume insights)';

    const candidateLine = candidateName ? `Candidate name: ${candidateName}` : 'Candidate name unavailable';

    const request = {
        role: 'user',
        content: `Generate a single ${difficulty.toLowerCase()} difficulty interview question for a full-stack React + Node candidate.
Focus on practical problem-solving and architectural reasoning.
Avoid repeating these topics: ${askedTopics.join(', ') || 'none yet'}.
Return valid JSON with fields:
  - prompt (string): the question phrased to the candidate.
  - rubric (array or string): key focus points the answer should cover.
  - topic (string, optional): concise topic label to help avoid repetition.
${candidateLine}
${personalizedContext}

Resume text excerpt:
${truncateText(resumeText)}`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ]);

    if (!result.prompt) {
        throw new Error('AI question response missing prompt field');
    }

    const rubricItems = normalizeArray(result.rubric || result.focusPoints);

    return {
        prompt: String(result.prompt).trim(),
        expectedNote: rubricItems ? rubricItems.join('\n') : String(result.rubric || '').trim(),
        topic: result.topic ? String(result.topic) : undefined,
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

    const systemPrompt = 'You are preparing tailored interview context from a candidate resume for a senior full-stack interview.';
    const request = {
        role: 'user',
        content: `Analyze the following resume text and return JSON with:\n- highlights: array of 3 concise bullet points summarizing strengths\n- skills: array of key technologies or tools (max 10)\n- roles: array of notable past roles or titles (max 5)\n- experienceYears: numeric estimate of total years of professional experience (can be decimal)\n- focusAreas: array of suggested topics to probe in the interview (max 5), each as an object { topic: string, reason: string }\n\nResume text:\n${truncateText(resumeText, 4000)}`,
    };

    const result = await createJsonResponse([
        { role: 'system', content: systemPrompt },
        request,
    ], { maxOutputTokens: 450 });

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
