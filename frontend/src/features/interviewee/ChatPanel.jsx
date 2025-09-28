import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Card, Divider, Flex, Input, Space, Spin, Tag, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { useAppDispatch } from '../../store/hooks';
import {
    markTimerPaused,
    markTimerResumed,
    submitAnswerThunk,
    finalizeSessionThunk,
} from '../../store/sessionSlice';
import { difficultyLabel, difficultyOrder } from '../../utils/interviewConfig';
import { secondsRemaining, formatSeconds } from '../../utils/time';

const { Text, Title } = Typography;

const senderColors = {
    SYSTEM: 'gray',
    AI: 'blue',
    INTERVIEWEE: 'green',
    INTERVIEWER: 'purple',
};

export default function ChatPanel({
    session,
    timer,
    status,
    loading,
    pendingAction,
}) {
    const dispatch = useAppDispatch();
    const [answer, setAnswer] = useState('');
    const [remaining, setRemaining] = useState(secondsRemaining(timer));
    const autoSubmitRef = useRef(false);
    const scrollRef = useRef(null);
    const { message } = AntdApp.useApp();

    const currentQuestion = useMemo(() => {
        if (!session) return null;
        return session.questions.find((q) => q.order === session.currentQuestionIndex);
    }, [session]);

    const answeredQuestions = session?.answers || [];
    const answeredIds = new Set(answeredQuestions.map((ans) => ans.questionId));
    const totalQuestions = difficultyOrder.length;
    const answeredCount = answeredIds.size;
    const hasCurrentAnswer = currentQuestion ? answeredIds.has(currentQuestion.id) : false;

    useEffect(() => {
        setAnswer('');
        autoSubmitRef.current = false;
    }, [currentQuestion?.id]);

    useEffect(() => {
        setRemaining(secondsRemaining(timer));
        if (!timer?.questionId || status !== 'active' || timer?.pausedAt) {
            return () => { };
        }

        const intervalId = setInterval(() => {
            const secs = secondsRemaining(timer);
            setRemaining(secs);

            if (secs === 0 && !autoSubmitRef.current && currentQuestion && !hasCurrentAnswer) {
                autoSubmitRef.current = true;
                dispatch(
                    submitAnswerThunk({
                        sessionId: session.id,
                        answer: {
                            questionId: currentQuestion.id,
                            answerText: '',
                            timeTakenSeconds: timer.duration,
                            autoSubmitted: true,
                        },
                    })
                ).catch((error) => {
                    message.error(error.message || 'Failed to auto-submit answer');
                });
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timer, status, dispatch, session?.id, currentQuestion, hasCurrentAnswer]);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [session?.messages]);

    const handleSubmit = async () => {
        if (!currentQuestion) return;
        if (!answer.trim()) {
            message.warning('Please enter your answer before submitting.');
            return;
        }

        const elapsed = timer?.startedAt ? dayjs().diff(dayjs(timer.startedAt), 'second') : 0;

        try {
            autoSubmitRef.current = true;
            await dispatch(
                submitAnswerThunk({
                    sessionId: session.id,
                    answer: {
                        questionId: currentQuestion.id,
                        answerText: answer,
                        timeTakenSeconds: elapsed,
                    },
                })
            ).unwrap();
            setAnswer('');
            autoSubmitRef.current = false;
        } catch (error) {
            autoSubmitRef.current = false;
            message.error(error.message || 'Failed to submit answer');
        }
    };

    const handleFinalize = async () => {
        try {
            await dispatch(finalizeSessionThunk(session.id)).unwrap();
            message.success('Interview finalized');
        } catch (error) {
            message.error(error.message || 'Failed to finalize session');
        }
    };

    const handleTogglePause = () => {
        if (!timer?.questionId) return;
        if (timer.pausedAt) {
            dispatch(markTimerResumed());
        } else {
            dispatch(markTimerPaused());
        }
    };

    const isCompleted = status === 'completed';
    const aiReviewing = pendingAction === 'submitAnswer';

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
                <Flex justify="space-between" align="center" wrap>
                    <div>
                        <Title level={4} style={{ marginBottom: 0 }}>
                            Interview progress
                        </Title>
                        <Text type="secondary">
                            Question {Math.min(answeredCount + 1, totalQuestions)} of {totalQuestions}
                        </Text>
                    </div>
                    <Space>
                        {!isCompleted && timer?.questionId && (
                            <Tag color={timer.pausedAt ? 'orange' : remaining > 10 ? 'blue' : 'red'}>
                                {timer.pausedAt ? 'Paused' : `Time left: ${formatSeconds(remaining)}`}
                            </Tag>
                        )}
                        {currentQuestion && (
                            <Tag color="purple">{difficultyLabel(currentQuestion.difficulty)}</Tag>
                        )}
                    </Space>
                </Flex>
                <Timeline
                    style={{ marginTop: 24 }}
                    items={difficultyOrder.map((difficulty, index) => {
                        const question = session?.questions?.find((q) => q.order === index);
                        const answered = question ? answeredIds.has(question.id) : false;
                        return {
                            color: answered ? 'green' : index === session?.currentQuestionIndex ? 'blue' : 'gray',
                            children: `Q${index + 1}: ${difficultyLabel(difficulty)}`,
                        };
                    })}
                />
            </Card>

            <Card title="Interview chat">
                <div
                    ref={scrollRef}
                    style={{
                        maxHeight: 320,
                        overflowY: 'auto',
                        paddingRight: 8,
                        marginBottom: 16,
                    }}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {session?.messages?.map((messageItem) => (
                            <Card
                                key={messageItem.id}
                                size="small"
                                style={{
                                    borderColor: senderColors[messageItem.sender] || '#d9d9d9',
                                    background:
                                        messageItem.sender === 'INTERVIEWEE'
                                            ? '#f6ffed'
                                            : messageItem.sender === 'AI'
                                                ? '#e6f4ff'
                                                : '#fff',
                                }}
                            >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Flex justify="space-between"
                                        align="center"
                                        wrap
                                        gap={8}
                                    >
                                        <Text strong>{messageItem.sender}</Text>
                                        <Space wrap size={4}>
                                            {messageItem.meta?.aiSource && (
                                                <Tag color={messageItem.meta.aiSource === 'ai' ? 'blue' : 'volcano'}>
                                                    {messageItem.meta.aiSource === 'ai' ? 'AI generated' : 'Template fallback'}
                                                </Tag>
                                            )}
                                            {typeof messageItem.meta?.difficulty === 'string' && (
                                                <Tag color="purple">{difficultyLabel(messageItem.meta.difficulty)}</Tag>
                                            )}
                                            {typeof messageItem.meta?.score === 'number' && (
                                                <Tag color="geekblue">Score: {messageItem.meta.score.toFixed(1)}</Tag>
                                            )}
                                            {messageItem.meta?.aiModel && (
                                                <Tag color="cyan">Model: {messageItem.meta.aiModel}</Tag>
                                            )}
                                            {messageItem.meta?.summarySource && (
                                                <Tag color={messageItem.meta.summarySource === 'ai' ? 'blue' : 'gold'}>
                                                    Summary via {messageItem.meta.summarySource === 'ai' ? 'AI' : 'rules'}
                                                </Tag>
                                            )}
                                            {typeof messageItem.meta?.aiEnabled === 'boolean' && (
                                                <Tag color={messageItem.meta.aiEnabled ? 'green' : 'volcano'}>
                                                    AI {messageItem.meta.aiEnabled ? 'ready' : 'disabled'}
                                                </Tag>
                                            )}
                                            <Text type="secondary">{dayjs(messageItem.createdAt).format('HH:mm')}</Text>
                                        </Space>
                                    </Flex>
                                    <Text>{messageItem.content}</Text>
                                    {Array.isArray(messageItem.meta?.strengths) && messageItem.meta.strengths.length > 0 && (
                                        <div>
                                            <Text strong>Strengths</Text>
                                            <ul style={{ margin: '4px 0 0 16px' }}>
                                                {messageItem.meta.strengths.map((item) => (
                                                    <li key={item}>
                                                        <Text>{item}</Text>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {Array.isArray(messageItem.meta?.improvements) && messageItem.meta.improvements.length > 0 && (
                                        <div>
                                            <Text strong>Areas to improve</Text>
                                            <ul style={{ margin: '4px 0 0 16px' }}>
                                                {messageItem.meta.improvements.map((item) => (
                                                    <li key={item}>
                                                        <Text>{item}</Text>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {messageItem.meta?.aiError && (
                                        <Alert
                                            type="warning"
                                            showIcon
                                            message="AI assistance unavailable"
                                            description={messageItem.meta.aiError}
                                        />
                                    )}
                                </Space>
                            </Card>
                        ))}
                    </Space>
                </div>
                {aiReviewing && (
                    <Alert
                        type="info"
                        showIcon
                        message="Analyzing your answer"
                        description={
                            <Space>
                                <Spin size="small" />
                                <Text>Our AI is reviewing your response to provide tailored feedback.</Text>
                            </Space>
                        }
                        style={{ marginBottom: 16 }}
                    />
                )}
                {!isCompleted && currentQuestion && !hasCurrentAnswer && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>Answer the question:</Text>
                        <Input.TextArea
                            rows={4}
                            value={answer}
                            onChange={(event) => setAnswer(event.target.value)}
                            placeholder="Type your response here..."
                            disabled={loading || timer?.pausedAt}
                        />
                        <Flex gap="small" wrap>
                            <Button type="primary" onClick={handleSubmit} loading={loading} disabled={timer?.pausedAt}>
                                Submit answer
                            </Button>
                            <Button onClick={handleTogglePause}>
                                {timer?.pausedAt ? 'Resume timer' : 'Pause timer'}
                            </Button>
                        </Flex>
                    </Space>
                )}
                {isCompleted && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Divider />
                        <Text strong>
                            Interview completed. Final score: {session.finalScore ? session.finalScore.toFixed(1) : 'Pending'}/10
                        </Text>
                        <Text type="secondary">{session.summary}</Text>
                    </Space>
                )}
            </Card>

            {status === 'active' && hasCurrentAnswer && (
                <Card>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">Waiting for the next question...</Text>
                    </Space>
                </Card>
            )}

            {status !== 'completed' && answeredCount === totalQuestions && (
                <Button type="default" onClick={handleFinalize} loading={loading}>
                    Finalize interview
                </Button>
            )}
        </Space>
    );
}
