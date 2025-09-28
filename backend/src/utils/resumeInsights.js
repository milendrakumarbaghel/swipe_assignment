const DEFAULT_FOCUS_TOPICS = [
    {
        topic: 'React component architecture',
        reason: 'Core capability for building the interview experience across complex UIs.',
    },
    {
        topic: 'Node.js API design',
        reason: 'Essential to confirm the candidate can deliver robust backend services.',
    },
    {
        topic: 'Data modeling and persistence',
        reason: 'Full-stack roles require thoughtful database and ORM design decisions.',
    },
];

const SKILL_MATCHERS = [
    {
        name: 'React',
        patterns: ['react', 'react.js', 'reactjs', 'next.js', 'nextjs'],
        highlight: 'Hands-on experience shipping React applications.',
        focus: {
            topic: 'Advanced React patterns',
            reason: 'Resume highlights React usage; validate depth with hooks, context, and performance tuning.',
        },
    },
    {
        name: 'Redux',
        patterns: ['redux', 'redux-toolkit', 'zustand', 'mobx'],
        highlight: 'Familiar with state management libraries.',
        focus: {
            topic: 'Scaling state management',
            reason: 'Explore trade-offs the candidate makes when structuring shared state.',
        },
    },
    {
        name: 'TypeScript',
        patterns: ['typescript', 'tsconfig'],
        highlight: 'Worked with TypeScript in production.',
        focus: {
            topic: 'TypeScript type design',
            reason: 'Assess ability to design resilient type systems for large codebases.',
        },
    },
    {
        name: 'Node.js',
        patterns: ['node.js', 'nodejs', 'node ', 'express', 'koa', 'nestjs'],
        highlight: 'Backend delivery experience with Node.js or Express services.',
        focus: {
            topic: 'Node.js service design',
            reason: 'Discuss how the candidate structures APIs, middleware, and error handling.',
        },
    },
    {
        name: 'GraphQL',
        patterns: ['graphql', 'apollo', 'hasura'],
        highlight: 'Exposure to GraphQL ecosystems.',
        focus: {
            topic: 'GraphQL schema design',
            reason: 'Validate ability to craft schemas and resolve complex data graphs.',
        },
    },
    {
        name: 'Testing',
        patterns: ['jest', 'testing library', 'cypress', 'playwright'],
        highlight: 'Invests in automated testing suites.',
        focus: {
            topic: 'Testing strategy',
            reason: 'Understand how the candidate balances unit, integration, and e2e coverage.',
        },
    },
    {
        name: 'DevOps',
        patterns: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform'],
        highlight: 'Comfortable with cloud or container tooling.',
        focus: {
            topic: 'Deployment and scalability',
            reason: 'Probe approaches to deploying and scaling full-stack workloads safely.',
        },
    },
    {
        name: 'Databases',
        patterns: ['mongodb', 'postgres', 'mysql', 'sql', 'prisma', 'sequelize', 'typeorm'],
        highlight: 'Worked across relational or document data stores.',
        focus: {
            topic: 'Database modeling',
            reason: 'Discuss how the candidate models entities and handles migrations.',
        },
    },
    {
        name: 'CI/CD',
        patterns: ['ci/cd', 'continuous integration', 'jenkins', 'github actions', 'gitlab ci', 'pipeline'],
        highlight: 'Familiar with continuous integration and delivery practices.',
        focus: {
            topic: 'CI/CD automation',
            reason: 'Gauge ability to automate testing, build, and deploy pipelines.',
        },
    },
    {
        name: 'Real-time',
        patterns: ['websocket', 'socket.io', 'real-time', 'signalr'],
        highlight: 'Experienced building collaborative, real-time experiences.',
        focus: {
            topic: 'Real-time collaboration design',
            reason: 'Understand strategies for synchronization, events, and scaling live features.',
        },
    },
];

const CORE_EXPECTED = [
    {
        name: 'React',
        fallback: {
            topic: 'React fundamentals',
            reason: 'Resume did not strongly emphasize React; ensure front-end foundations are in place.',
        },
    },
    {
        name: 'Node.js',
        fallback: {
            topic: 'Node.js fundamentals',
            reason: 'Resume is light on backend delivery; confirm comfort building Node.js APIs.',
        },
    },
];

function normalizeText(text) {
    return (text || '').toLowerCase();
}

function upsertFocusArea(focusAreas, focus) {
    if (!focus?.topic) return;
    const topicKey = focus.topic.toLowerCase();
    if (focusAreas.some((item) => item.topic && item.topic.toLowerCase() === topicKey)) {
        return;
    }
    focusAreas.push(focus);
}

function uniqueStrings(values, { limit } = {}) {
    const set = new Set();
    const result = [];
    (values || []).forEach((value) => {
        if (!value) return;
        const trimmed = String(value).trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!set.has(key)) {
            set.add(key);
            result.push(trimmed);
        }
    });
    if (typeof limit === 'number' && limit > 0) {
        return result.slice(0, limit);
    }
    return result;
}

function extractRoles(text) {
    if (!text) return [];
    const roles = new Set();
    const roleRegex = /(senior|lead|principal|staff|full\s*stack|frontend|back\s*end|software|engineering\s*manager)[^\n\r,]{0,40}/gi;
    let match;
    while ((match = roleRegex.exec(text)) !== null) {
        const value = match[0]
            .replace(/\s+/g, ' ')
            .replace(/\./g, '')
            .trim();
        if (value) {
            roles.add(value);
        }
    }
    return Array.from(roles).slice(0, 5);
}

function deriveExperienceYears(text) {
    if (!text) return null;
    const matches = Array.from(text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi));
    if (!matches.length) {
        return null;
    }
    const values = matches.map((match) => Number(match[1])).filter((value) => !Number.isNaN(value));
    if (!values.length) {
        return null;
    }
    return Math.max(...values);
}

function deriveResumeInsights(text) {
    const normalized = normalizeText(text);
    const detectedSkills = new Set();
    const focusAreas = [];
    const highlights = [];

    SKILL_MATCHERS.forEach((matcher) => {
        const matchedKeyword = matcher.patterns.find((pattern) => normalized.includes(pattern));
        if (matchedKeyword) {
            detectedSkills.add(matcher.name);
            if (matcher.highlight) {
                highlights.push(matcher.highlight);
            }
            if (matcher.focus) {
                upsertFocusArea(focusAreas, matcher.focus);
            }
        }
    });

    CORE_EXPECTED.forEach((core) => {
        if (!detectedSkills.has(core.name) && core.fallback) {
            upsertFocusArea(focusAreas, core.fallback);
        }
    });

    if (!focusAreas.length) {
        DEFAULT_FOCUS_TOPICS.forEach((focus) => upsertFocusArea(focusAreas, focus));
    }

    const experienceYears = deriveExperienceYears(text);
    if (experienceYears) {
        highlights.push(`Approximately ${experienceYears}+ years of experience noted in the resume.`);
    }

    const roles = extractRoles(text);
    if (roles.length) {
        roles.slice(0, 3).forEach((role) => {
            highlights.push(`Experience as ${role}.`);
        });
    }

    if (detectedSkills.size) {
        highlights.push(`Key tools mentioned: ${Array.from(detectedSkills).join(', ')}.`);
    }

    const finalHighlights = uniqueStrings(highlights, { limit: 5 });
    const finalSkills = uniqueStrings(Array.from(detectedSkills));
    const finalFocusAreas = focusAreas.slice(0, 5);

    return {
        highlights: finalHighlights,
        skills: finalSkills,
        roles,
        focusAreas: finalFocusAreas,
        experienceYears: experienceYears || null,
    };
}

function mergeResumeInsights(primary = null, secondary = null) {
    if (!primary && !secondary) {
        return null;
    }

    const base = primary || {};
    const extra = secondary || {};
    const combinedHighlights = uniqueStrings([...(base.highlights || []), ...(extra.highlights || [])], {
        limit: 7,
    });
    const combinedSkills = uniqueStrings([...(base.skills || []), ...(extra.skills || [])], {
        limit: 12,
    });
    const combinedRoles = uniqueStrings([...(base.roles || []), ...(extra.roles || [])], {
        limit: 6,
    });

    // Handle new fields from enhanced AI analysis
    const combinedUniqueDetails = uniqueStrings([...(base.uniqueDetails || []), ...(extra.uniqueDetails || [])], {
        limit: 5,
    });
    const combinedProjectTypes = uniqueStrings([...(base.projectTypes || []), ...(extra.projectTypes || [])], {
        limit: 8,
    });

    const focusMap = new Map();
    [...(base.focusAreas || []), ...(extra.focusAreas || [])].forEach((focus) => {
        if (!focus || !focus.topic) return;
        const key = focus.topic.toLowerCase();
        if (!focusMap.has(key)) {
            focusMap.set(key, {
                topic: focus.topic,
                reason: focus.reason,
            });
        }
    });

    const mergedFocus = Array.from(focusMap.values()).slice(0, 6);
    const experienceYears = extra.experienceYears || base.experienceYears || null;
    const industryContext = extra.industryContext || base.industryContext || null;

    return {
        highlights: combinedHighlights,
        skills: combinedSkills,
        roles: combinedRoles,
        focusAreas: mergedFocus,
        experienceYears,
        uniqueDetails: combinedUniqueDetails,
        projectTypes: combinedProjectTypes,
        industryContext,
    };
}

module.exports = {
    deriveResumeInsights,
    mergeResumeInsights,
    DEFAULT_FOCUS_TOPICS,
};
