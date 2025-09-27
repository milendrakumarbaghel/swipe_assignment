import { Drawer, Typography, Descriptions, Timeline, List, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { difficultyLabel } from '../../utils/interviewConfig';

const { Title, Text, Paragraph } = Typography;

function renderMessages(messages) {
    return (
        <List
            size="small"
            dataSource={messages}
            renderItem={(item) => (
                <List.Item>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>
                            {item.sender}{' '}
                            <Text type="secondary">{dayjs(item.createdAt).format('MMM D, HH:mm')}</Text>
                        </Text>
                        <Text>{item.content}</Text>
                    </Space>
                </List.Item>
            )}
        />
    );
}

export default function CandidateDetailDrawer({ open, onClose, candidate }) {
    if (!candidate) return null;

    const latestInterview = candidate.interviews?.[0];

    return (
        <Drawer width={720} open={open} onClose={onClose} title={`Candidate: ${candidate.name}`}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Email">{candidate.email}</Descriptions.Item>
                    <Descriptions.Item label="Phone">{candidate.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Resume">
                        {candidate.resumeUrl ? (
                            <a href={candidate.resumeUrl} target="_blank" rel="noreferrer">
                                {candidate.resumeName || 'View resume'}
                            </a>
                        ) : (
                            '—'
                        )}
                    </Descriptions.Item>
                </Descriptions>

                {latestInterview && (
                    <Space direction="vertical" size="middle">
                        <Title level={4}>Latest interview</Title>
                        <Paragraph>
                            Final score:{' '}
                            <Text strong>{latestInterview.finalScore ? latestInterview.finalScore.toFixed(1) : 'Pending'} / 10</Text>
                        </Paragraph>
                        <Paragraph>{latestInterview.summary || 'Summary not available yet.'}</Paragraph>

                        <Timeline
                            mode="left"
                            items={latestInterview.questions.map((question) => {
                                const answer = latestInterview.answers.find((item) => item.questionId === question.id);
                                return {
                                    label: `Q${question.order + 1}`,
                                    children: (
                                        <Space direction="vertical" size="small">
                                            <Text strong>{question.prompt}</Text>
                                            <Tag>{difficultyLabel(question.difficulty)}</Tag>
                                            {answer ? (
                                                <div>
                                                    <Paragraph>
                                                        <Text strong>Answer:</Text> {answer.responseText || '(no answer)'}
                                                    </Paragraph>
                                                    <Paragraph>
                                                        <Text strong>Score:</Text> {answer.score !== null && answer.score !== undefined ? answer.score.toFixed(1) : '—'}
                                                    </Paragraph>
                                                    <Paragraph>
                                                        <Text strong>Feedback:</Text> {answer.aiFeedback || '—'}
                                                    </Paragraph>
                                                </div>
                                            ) : (
                                                <Text type="secondary">No answer recorded.</Text>
                                            )}
                                        </Space>
                                    ),
                                };
                            })}
                        />

                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Title level={5}>Chat transcript</Title>
                            {renderMessages(latestInterview.messages)}
                        </Space>
                    </Space>
                )}
            </Space>
        </Drawer>
    );
}
