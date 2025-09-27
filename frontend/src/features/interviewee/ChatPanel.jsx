import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Divider, Flex, Input, Space, Tag, Timeline, Typography, message } from 'antd';
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
}) {
    const dispatch = useAppDispatch();
    const [answer, setAnswer] = useState('');
    const [remaining, setRemaining] = useState(secondsRemaining(timer));
    const autoSubmitRef = useRef(false);
    const scrollRef = useRef(null);

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
                                    <Flex justify="space-between">
                                        <Text strong>{messageItem.sender}</Text>
                                        <Text type="secondary">{dayjs(messageItem.createdAt).format('HH:mm')}</Text>
                                    </Flex>
                                    <Text>{messageItem.content}</Text>
                                </Space>
                            </Card>
                        ))}
                    </Space>
                </div>
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
