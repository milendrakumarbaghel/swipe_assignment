function buildSummary({ candidate, scores }) {
  if (!scores.length) {
    return 'Interview session ended before any questions were answered.';
  }

  const average = (
    scores.reduce((total, item) => total + item.score, 0) / Math.max(scores.length, 1)
  ).toFixed(1);

  const topAnswer = scores.reduce((best, current) => {
    if (!best || current.score > best.score) {
      return current;
    }
    return best;
  }, null);

  const focus = topAnswer ? topAnswer.question.difficulty.toLowerCase() : 'overall';

  return `${candidate.name || 'The candidate'} demonstrated a solid understanding of ${focus} concepts with an average score of ${average}/10. ${
    topAnswer ? `Their strongest response covered "${topAnswer.question.prompt}".` : ''
  }`;
}

module.exports = {
  buildSummary,
};
