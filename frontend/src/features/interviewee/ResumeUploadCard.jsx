import { useState } from 'react';
import { CloudUploadOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Card, Upload, Typography } from 'antd';

const { Dragger } = Upload;
const { Paragraph } = Typography;

const ACCEPTED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function ResumeUploadCard({ onUpload, loading, candidate, resume }) {
    const [uploading, setUploading] = useState(false);
    const { message } = AntdApp.useApp();

    const handleUpload = async ({ file, onSuccess, onError }) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            message.error('Please upload a PDF or DOCX file.');
            onError?.(new Error('Invalid file type'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            message.error('File size must be under 5MB.');
            onError?.(new Error('File too large'));
            return;
        }

        try {
            setUploading(true);
            await onUpload(file);
            message.success('Resume processed successfully');
            onSuccess?.('ok');
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error.message || 'Failed to process resume';
            message.error(errorMessage);
            onError?.(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card
            title="Upload your resume"
            extra={resume?.originalName ? `Selected: ${resume.originalName}` : null}
            loading={loading && !uploading}
        >
            <Dragger
                name="resume"
                multiple={false}
                showUploadList={false}
                customRequest={handleUpload}
                accept=".pdf,.doc,.docx"
                disabled={loading || uploading}
                style={{ padding: 16 }}
            >
                <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined />
                </p>
                <p className="ant-upload-text">Click or drag resume to this area to upload</p>
                <Paragraph type="secondary">PDF is preferred. DOCX is also accepted.</Paragraph>
            </Dragger>
            {(candidate.name || candidate.email || candidate.phone) && (
                <Alert
                    style={{ marginTop: 16 }}
                    type="success"
                    message="Resume preview"
                    description={
                        <div>
                            <div><strong>Name:</strong> {candidate.name || '—'}</div>
                            <div><strong>Email:</strong> {candidate.email || '—'}</div>
                            <div><strong>Phone:</strong> {candidate.phone || '—'}</div>
                        </div>
                    }
                    showIcon
                />
            )}
        </Card>
    );
}
