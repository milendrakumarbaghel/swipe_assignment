const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveResumeInsights, mergeResumeInsights, DEFAULT_FOCUS_TOPICS } = require('../utils/resumeInsights');

test('deriveResumeInsights captures skills and focus areas from resume text', () => {
    const sample = `Senior Full Stack Developer with 8 years experience building React, Redux, and Node.js services.
    Led deployments on AWS using Docker and authored extensive Jest tests.`;

    const insights = deriveResumeInsights(sample);

    assert.ok(insights, 'insights should be generated');
    assert.ok(insights.skills.includes('React'), 'React skill detected');
    assert.ok(insights.skills.includes('Node.js'), 'Node.js skill detected');
    assert.ok(insights.skills.includes('DevOps'), 'Cloud/devops skill detected');
    assert.ok(insights.highlights.length > 0, 'highlights populated');
    assert.ok(
        insights.focusAreas.some((area) => area.topic && area.topic.toLowerCase().includes('react')),
        'react-focused question suggested'
    );
    assert.ok(
        insights.focusAreas.some((area) => area.topic && area.topic.toLowerCase().includes('deployment')),
        'deployment-focused question suggested'
    );
    assert.equal(insights.experienceYears, 8);
});

test('deriveResumeInsights falls back to core topics when gaps exist', () => {
    const sample = 'Front-end engineer shipping responsive UIs with React and TypeScript.';
    const insights = deriveResumeInsights(sample);

    assert.ok(
        insights.focusAreas.some((area) => area.topic && area.topic.toLowerCase().includes('react')),
        'React-oriented focus retained'
    );
    assert.ok(
        insights.focusAreas.some((area) => area.topic === 'Node.js fundamentals' || area.topic === 'Node.js service design'),
        'Ensures backend focus when Node is absent'
    );
});

test('mergeResumeInsights deduplicates arrays and prefers secondary experience years', () => {
    const primary = {
        highlights: ['Primary highlight'],
        skills: ['React'],
        roles: ['Senior Engineer'],
        focusAreas: DEFAULT_FOCUS_TOPICS,
        experienceYears: 5,
    };

    const secondary = {
        highlights: ['AI summary highlight', 'Primary highlight'],
        skills: ['Node.js', 'React'],
        roles: ['Lead Engineer'],
        focusAreas: [
            { topic: 'GraphQL schema design', reason: 'Secondary suggests GraphQL' },
            { topic: 'React component architecture', reason: 'Already included' },
        ],
        experienceYears: 7,
    };

    const merged = mergeResumeInsights(primary, secondary);

    assert.equal(merged.experienceYears, 7);
    assert.deepEqual(merged.skills.sort(), ['Node.js', 'React']);
    assert.ok(merged.highlights.includes('Primary highlight'));
    assert.ok(merged.highlights.includes('AI summary highlight'));
    assert.ok(
        merged.focusAreas.some((area) => area.topic === 'GraphQL schema design'),
        'Merged focus areas keep new topics'
    );
});
