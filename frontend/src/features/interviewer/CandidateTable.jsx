import { Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

function statusTag(status) {
    switch (status) {
        case 'COMPLETED':
            return <Tag color="green">Completed</Tag>;
        case 'ACTIVE':
            return <Tag color="blue">Active</Tag>;
        case 'PENDING_INFO':
            return <Tag color="gold">Pending Info</Tag>;
        case 'PAUSED':
            return <Tag color="purple">Paused</Tag>;
        default:
            return <Tag>{status}</Tag>;
    }
}

export default function CandidateTable({ items, loading, onSortChange, onSelect }) {
    const columns = [
        {
            title: 'Candidate',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (value, record) => (
                <div>
                    <Text strong>{value}</Text>
                    <div>
                        <Text type="secondary">{record.email}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Score',
            dataIndex: ['latestInterview', 'finalScore'],
            key: 'score',
            sorter: true,
            render: (value) => (value !== null && value !== undefined ? value.toFixed(1) : '—'),
            width: 120,
        },
        {
            title: 'Status',
            dataIndex: ['latestInterview', 'status'],
            key: 'status',
            render: (value) => statusTag(value || 'N/A'),
            width: 140,
        },
        {
            title: 'Updated',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: true,
            render: (value) => (value ? dayjs(value).format('MMM D, HH:mm') : '—'),
            width: 160,
        },
    ];

    return (
        <Table
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={items}
            loading={loading}
            pagination={false}
            onChange={(pagination, filters, sorter) => {
                if (onSortChange && sorter.order) {
                    let field = 'finalScore';
                    if (sorter.field === 'name') field = 'name';
                    if (sorter.field === 'updatedAt') field = 'updatedAt';
                    if (Array.isArray(sorter.field) && sorter.field.includes('updatedAt')) field = 'updatedAt';
                    if (Array.isArray(sorter.field) && sorter.field.includes('name')) field = 'name';
                    const order = sorter.order === 'ascend' ? 'asc' : 'desc';
                    onSortChange({ field, order });
                }
            }}
            onRow={(record) => ({
                onClick: () => onSelect?.(record),
                style: { cursor: 'pointer' },
            })}
        />
    );
}
