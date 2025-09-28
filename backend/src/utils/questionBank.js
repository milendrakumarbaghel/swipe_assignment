const easyQuestions = [
    {
        topic: 'JavaScript fundamentals',
        prompt: 'Explain the difference between let, const, and var in JavaScript.',
        expected: 'Discusses scoping differences, reassignment, hoisting behavior, block vs function scope.',
    },
    {
        topic: 'React fundamentals',
        prompt: 'How do you create a simple functional component in React?',
        expected: 'Mentions function returning JSX, use of props, and export.',
    },
    {
        topic: 'Tooling fundamentals',
        prompt: 'What is npm and why is it important in Node.js development?',
        expected: 'Describes package manager, dependency management, scripts.',
    },
    {
        topic: 'TypeScript type design',
        prompt: 'What advantages does TypeScript provide over plain JavaScript for large codebases?',
        expected: 'Mentions static typing, tooling, safer refactors, interface enforcement, catching bugs early.',
    },
    {
        topic: 'Node.js fundamentals',
        prompt: 'In your own words, what is the Node.js event loop and why is it important?',
        expected: 'Explains single-threaded nature, non-blocking IO, phases, how async callbacks get executed.',
    },
    {
        topic: 'Testing basics',
        prompt: 'Give an example of a simple Jest test for a pure function. What value does it provide?',
        expected: 'Demonstrates arrange/act/assert, describes regression protection and fast feedback.',
    },
];

const mediumQuestions = [
    {
        topic: 'State management patterns',
        prompt: 'Describe how you would manage state in a React application that needs to share data across many components.',
        expected: 'Mentions Context API, Redux, or other global state solutions and trade-offs.',
    },
    {
        topic: 'Node.js API security',
        prompt: 'How would you design an Express middleware to authenticate API requests?',
        expected: 'Talks about JWT/cookies, verifying tokens, calling next, handling errors.',
    },
    {
        topic: 'Backend architecture',
        prompt: 'Explain how you would structure API routes and controllers in a Node.js + Express project.',
        expected: 'Mentions separating routes/controllers/services, modularization, error handling.',
    },
    {
        topic: 'React component architecture',
        prompt: 'Design a reusable React component for uploading resumes and handling validation feedback.',
        expected: 'Discusses controlled inputs, drag-and-drop or file picker, validation messages, async status, accessibility.',
    },
    {
        topic: 'GraphQL schema design',
        prompt: 'How would you introduce GraphQL to an existing REST-based Node.js service?',
        expected: 'Covers schema design, resolvers, data loaders, coexisting with REST, performance considerations.',
    },
    {
        topic: 'Database modeling',
        prompt: 'Walk through designing a relational schema to store interviews, questions, and candidate answers.',
        expected: 'Identifies entities, relationships, indexing strategy, handling updates and historical data.',
    },
];

const hardQuestions = [
    {
        topic: 'Secure file uploads at scale',
        prompt: 'Walk through designing a scalable, secure file upload pipeline for a React + Node application.',
        expected: 'Touches on storage (S3, CDN), validation, streaming, security, async processing.',
    },
    {
        topic: 'React performance optimization',
        prompt: 'How would you optimize the performance of a large React application with complex state and routing?',
        expected: 'Discusses code splitting, memoization, virtualization, caching, performance profiling.',
    },
    {
        topic: 'Real-time collaboration design',
        prompt: 'Explain how you would architect a real-time collaboration feature between interviewer and interviewee using Node.js.',
        expected: 'Mentions WebSockets, event-driven design, synchronization, data consistency, scaling concerns.',
    },
    {
        topic: 'Deployment and scalability',
        prompt: 'Outline a CI/CD pipeline for deploying a full-stack React and Node application with zero-downtime releases.',
        expected: 'Highlights build automation, automated tests, blue/green or rolling deployments, observability, rollback strategy.',
    },
    {
        topic: 'TypeScript architecture',
        prompt: 'How would you architect a large TypeScript monorepo shared across frontend and backend teams?',
        expected: 'Talks about project references, shared types, linting, incremental builds, enforcing contracts.',
    },
    {
        topic: 'Node.js service resilience',
        prompt: 'Design a Node.js service for interview scheduling that remains reliable under heavy load.',
        expected: 'Discusses horizontal scaling, queues, rate limiting, observability, graceful degradation.',
    },
];

module.exports = {
    easyQuestions,
    mediumQuestions,
    hardQuestions,
};
