import { Modal, Typography, Space } from 'antd';
import dayjs from 'dayjs';
import { difficultyLabel } from '../../utils/interviewConfig';

const { Text } = Typography;

export default function WelcomeBackModal({ visible, session, timer, onResume, onDiscard, confirmLoading }) {
    if (!session) return null;

    const currentQuestion = session.questions?.find((q) => q.order === session.currentQuestionIndex);
    const startedAt = timer?.startedAt ? dayjs(timer.startedAt).format('MMM D, h:mm:ss A') : 'unknown';
    const difficulty = currentQuestion ? difficultyLabel(currentQuestion.difficulty) : 'Pending';

    return (
        <Modal
            title="Welcome back!"
            open={visible}
            onCancel={onDiscard}
            okText="Resume interview"
            cancelText="Start over"
            onOk={onResume}
            okButtonProps={{ loading: confirmLoading }}
            destroyOnHidden
            maskClosable={false}
        >
            <Space direction="vertical" size="small">
                <Text>You have an interview in progress.</Text>
                {currentQuestion ? (
                    <Text>
                        You were answering question {currentQuestion.order + 1} ({difficulty}). Timer started at {startedAt}.
                    </Text>
                ) : (
                    <Text>The interview is awaiting the next question.</Text>
                )}
                <Text type="secondary">Resume to continue where you left off, or start a new interview.</Text>
            </Space>
        </Modal>
    );
}
