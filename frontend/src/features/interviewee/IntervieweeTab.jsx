import { useCallback, useEffect } from 'react';
import { Alert, App as AntdApp, Skeleton, Space } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectSession } from '../../store';
import { uploadResumeThunk, updateCandidateField, startInterviewThunk } from '../../store/sessionSlice';
import ResumeUploadCard from './ResumeUploadCard';
import MissingFieldsForm from './MissingFieldsForm';
import ChatPanel from './ChatPanel';

export default function IntervieweeTab() {
    const dispatch = useAppDispatch();
    const sessionState = useAppSelector(selectSession);
    const {
        status,
        candidate,
        resume,
        resumeText,
        resumeInsights,
        missingFields,
        loading,
        error,
        session,
        timer,
        pendingAction,
    } = sessionState;
    const { message } = AntdApp.useApp();

    useEffect(() => {
        if (error) {
            message.error(error);
        }
    }, [error]);

    const handleUpload = useCallback(
        async (file) => {
            await dispatch(uploadResumeThunk(file)).unwrap();
        },
        [dispatch]
    );

    const handleFieldChange = useCallback(
        (field, value) => {
            dispatch(updateCandidateField({ field, value }));
        },
        [dispatch]
    );

    const handleStartInterview = useCallback(
        async (values) => {
            try {
                await dispatch(
                    startInterviewThunk({
                        candidate: {
                            ...candidate,
                            ...values,
                        },
                        resume,
                        resumeText,
                    })
                ).unwrap();
                message.success('Interview started');
            } catch (err) {
                message.error(err.message || 'Failed to start interview');
            }
        },
        [dispatch, candidate, resume, resumeText]
    );

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {status === 'idle' && (
                <Alert
                    type="info"
                    showIcon
                    message="Welcome to the AI-powered interview assistant"
                    description="Upload your resume to kick things off. We'll extract your details and guide you through six timed questions."
                />
            )}

            <ResumeUploadCard
                onUpload={handleUpload}
                loading={loading}
                candidate={candidate}
                resume={resume}
                resumeInsights={resumeInsights}
            />

            {(status === 'collecting' || status === 'ready') && (
                <MissingFieldsForm
                    candidate={candidate}
                    missingFields={missingFields}
                    loading={loading}
                    onFieldChange={handleFieldChange}
                    onStartInterview={(values) => {
                        handleFieldChange('name', values.name);
                        handleFieldChange('email', values.email);
                        handleFieldChange('phone', values.phone);
                        handleStartInterview(values);
                    }}
                />
            )}

            {(status === 'active' || status === 'paused' || status === 'completed') && session ? (
                <ChatPanel
                    session={session}
                    status={status}
                    timer={timer}
                    loading={loading}
                    pendingAction={pendingAction}
                />
            ) : null}

            {loading && status === 'active' && !session && <Skeleton active paragraph={{ rows: 4 }} />}
        </Space>
    );
}
