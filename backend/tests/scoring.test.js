const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateScore } = require('../src/utils/scoring');

const SAMPLE_EXPECTED = 'Discusses scoping differences, reassignment, hoisting behavior, block vs function scope.';

test('calculateScore returns higher score when keywords present', () => {
    const detailedAnswer = 'Using const and let gives block scoped variables, while var is function scoped and hoisted. Reassignment differs.';
    const sparseAnswer = 'They are different.';

    const detailed = calculateScore(detailedAnswer, SAMPLE_EXPECTED, 'EASY', 15, 20);
    const sparse = calculateScore(sparseAnswer, SAMPLE_EXPECTED, 'EASY', 10, 20);

    assert.ok(detailed.score > sparse.score, 'Detailed answer should score higher');
    assert.match(detailed.feedback, /Good coverage|Solid answer/);
});

test('calculateScore penalizes missing or overtime answers', () => {
    const empty = calculateScore('', SAMPLE_EXPECTED, 'MEDIUM', 0, 60);
    assert.equal(empty.score, 0);
    assert.match(empty.feedback, /No substantial answer/);

    const overtime = calculateScore('Some reasonable answer mentioning hoisting and scope.', SAMPLE_EXPECTED, 'MEDIUM', 80, 60);
    assert.ok(overtime.score < 10);
    assert.match(overtime.feedback, /exceeded the recommended time/);
});
