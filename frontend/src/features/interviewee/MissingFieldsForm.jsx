import { useEffect } from 'react';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';

const { Text } = Typography;

export default function MissingFieldsForm({ candidate, missingFields, loading, onFieldChange, onStartInterview }) {
    const [form] = Form.useForm();

    useEffect(() => {
        form.setFieldsValue({
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
        });
    }, [candidate, form]);

    const handleValuesChange = (changedValues) => {
        const [field, value] = Object.entries(changedValues)[0];
        onFieldChange(field, value);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            onStartInterview(values);
        } catch (error) {
            // validation error; no action needed
        }
    };

    const allFieldsCollected = missingFields.length === 0;

    return (
        <Card title="Confirm your details" style={{ marginTop: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                    type={allFieldsCollected ? 'success' : 'warning'}
                    message={allFieldsCollected ? 'All required fields are ready.' : 'Please fill missing details before starting.'}
                    showIcon
                />
                <Form
                    layout="vertical"
                    form={form}
                    onValuesChange={handleValuesChange}
                    initialValues={{
                        name: candidate.name,
                        email: candidate.email,
                        phone: candidate.phone,
                    }}
                >
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Name is required' }]}
                    >
                        <Input placeholder="Full name" />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Enter a valid email address' }]}
                    >
                        <Input placeholder="Email" />
                    </Form.Item>
                    <Form.Item
                        label="Phone"
                        name="phone"
                        rules={[{ required: true, message: 'Phone number is required' }]}
                    >
                        <Input placeholder="Phone number" />
                    </Form.Item>
                </Form>
                <Space direction="vertical">
                    <Button type="primary" size="large" disabled={!allFieldsCollected} loading={loading} onClick={handleSubmit}>
                        Start interview
                    </Button>
                    {!allFieldsCollected && (
                        <Text type="secondary">Missing: {missingFields.join(', ')}</Text>
                    )}
                </Space>
            </Space>
        </Card>
    );
}
