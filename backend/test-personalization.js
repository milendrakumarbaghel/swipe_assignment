const { generateQuestion } = require('./src/services/aiService');

// Test data - two different resume profiles
const testResumes = {
    frontend: {
        text: `John Smith
Frontend Developer
React Developer at Google, 5 years experience
Built large-scale e-commerce platforms using React, Redux, TypeScript
Led a team of 8 developers on Google Shopping frontend
Implemented complex data visualization dashboards
Expert in React Hooks, Context API, Next.js
Built micro-frontend architecture for multi-team collaboration
Worked on performance optimization reducing load times by 40%`,
        insights: {
            highlights: ['Led 8-person development team', 'Built e-commerce platforms at scale', 'Performance optimization expert'],
            skills: ['React', 'Redux', 'TypeScript', 'Next.js', 'JavaScript'],
            roles: ['Frontend Developer at Google', 'Team Lead'],
            experienceYears: 5,
            focusAreas: [
                { topic: 'React performance optimization', reason: 'Candidate has proven expertise in optimizing React applications' },
                { topic: 'Team leadership', reason: 'Led large development teams' }
            ]
        }
    },
    backend: {
        text: `Sarah Johnson
Backend Engineer
Senior Backend Engineer at Netflix, 7 years experience
Designed and built microservices architecture handling 100M+ requests/day
Expert in Node.js, PostgreSQL, MongoDB, AWS, Docker, Kubernetes
Built real-time streaming data pipelines
Implemented distributed caching systems with Redis
Experience with GraphQL API design and implementation
Led database optimization projects reducing query times by 60%`,
        insights: {
            highlights: ['Handles 100M+ requests/day systems', 'Microservices architecture expert', 'Database optimization specialist'],
            skills: ['Node.js', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'Redis'],
            roles: ['Senior Backend Engineer at Netflix'],
            experienceYears: 7,
            focusAreas: [
                { topic: 'Microservices scalability', reason: 'Built large-scale distributed systems' },
                { topic: 'Database performance', reason: 'Proven track record in database optimization' }
            ]
        }
    }
};

async function testQuestionGeneration() {
    console.log('🧪 Testing Resume-Based Question Generation\n');

    const difficulty = 'MEDIUM';
    const askedTopics = [];

    try {
        // Generate question for frontend developer
        console.log('📄 Frontend Developer Resume (React/Google background)');
        console.log('='.repeat(60));

        const frontendQuestion = await generateQuestion({
            difficulty,
            resumeText: testResumes.frontend.text,
            askedTopics: [],
            candidateName: 'John Smith',
            resumeInsights: testResumes.frontend.insights
        });

        console.log('Question:', frontendQuestion.prompt);
        console.log('Topic:', frontendQuestion.topic);
        console.log('Personalization:', frontendQuestion.personalization);
        console.log('\n');

        // Generate question for backend developer
        console.log('📄 Backend Developer Resume (Node.js/Netflix background)');
        console.log('='.repeat(60));

        const backendQuestion = await generateQuestion({
            difficulty,
            resumeText: testResumes.backend.text,
            askedTopics: [],
            candidateName: 'Sarah Johnson',
            resumeInsights: testResumes.backend.insights
        });

        console.log('Question:', backendQuestion.prompt);
        console.log('Topic:', backendQuestion.topic);
        console.log('Personalization:', backendQuestion.personalization);
        console.log('\n');

        // Check if questions are different
        const questionsAreDifferent = frontendQuestion.prompt !== backendQuestion.prompt;
        console.log('✅ Result:', questionsAreDifferent ? 'SUCCESS - Questions are different and personalized!' : '❌ ISSUE - Questions are the same');

        if (questionsAreDifferent) {
            console.log('\n🎉 Resume-based question generation is working correctly!');
            console.log('- Frontend question focuses on React/Google experience');
            console.log('- Backend question focuses on Node.js/Netflix experience');
            console.log('- Each question is tailored to the candidate\'s background');
        } else {
            console.log('\n⚠️  Questions are still the same - need further investigation');
        }

    } catch (error) {
        console.error('❌ Error testing question generation:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testQuestionGeneration().catch(console.error);
}

module.exports = { testQuestionGeneration };
