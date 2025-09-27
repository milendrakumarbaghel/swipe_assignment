const easyQuestions = [
  {
    prompt: 'Explain the difference between let, const, and var in JavaScript.',
    expected: 'Discusses scoping differences, reassignment, hoisting behavior, block vs function scope.',
  },
  {
    prompt: 'How do you create a simple functional component in React?',
    expected: 'Mentions function returning JSX, use of props, and export.',
  },
  {
    prompt: 'What is npm and why is it important in Node.js development?',
    expected: 'Describes package manager, dependency management, scripts.',
  },
];

const mediumQuestions = [
  {
    prompt: 'Describe how you would manage state in a React application that needs to share data across many components.',
    expected: 'Mentions Context API, Redux, or other global state solutions and trade-offs.',
  },
  {
    prompt: 'How would you design an Express middleware to authenticate API requests?',
    expected: 'Talks about JWT/cookies, verifying tokens, calling next, handling errors.',
  },
  {
    prompt: 'Explain how you would structure API routes and controllers in a Node.js + Express project.',
    expected: 'Mentions separating routes/controllers/services, modularization, error handling.',
  },
];

const hardQuestions = [
  {
    prompt: 'Walk through designing a scalable, secure file upload pipeline for a React + Node application.',
    expected: 'Touches on storage (S3, CDN), validation, streaming, security, async processing.',
  },
  {
    prompt: 'How would you optimize the performance of a large React application with complex state and routing?',
    expected: 'Discusses code splitting, memoization, virtualization, caching, performance profiling.',
  },
  {
    prompt: 'Explain how you would architect a real-time collaboration feature between interviewer and interviewee using Node.js.',
    expected: 'Mentions WebSockets, event-driven design, synchronization, data consistency, scaling concerns.',
  },
];

module.exports = {
  easyQuestions,
  mediumQuestions,
  hardQuestions,
};
