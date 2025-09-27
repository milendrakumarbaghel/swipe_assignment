import { useEffect } from 'react';
import { Button, Card, Input, Space, Typography, message } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCandidates } from '../../store';
import {
    fetchCandidatesThunk,
    fetchCandidateDetailThunk,
    setSearch,
    setSort,
    setSelectedCandidate,
    clearSelectedCandidate,
} from '../../store/candidatesSlice';
import CandidateTable from './CandidateTable';
import CandidateDetailDrawer from './CandidateDetailDrawer';

const { Text } = Typography;
const REFRESH_INTERVAL = 1000 * 10;

export default function InterviewerTab() {
    const dispatch = useAppDispatch();
    const { items, loading, search, sortField, sortOrder, selectedId, selectedDetail, error } = useAppSelector(selectCandidates);

    useEffect(() => {
        dispatch(fetchCandidatesThunk({ search, sortField, sortOrder }));
        const intervalId = setInterval(() => {
            dispatch(fetchCandidatesThunk({ search, sortField, sortOrder }));
            if (selectedId) {
                dispatch(fetchCandidateDetailThunk(selectedId));
            }
        }, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [dispatch, search, sortField, sortOrder, selectedId]);

    useEffect(() => {
        if (error) {
            message.error(error);
        }
    }, [error]);

    const handleSelectCandidate = (record) => {
        dispatch(setSelectedCandidate(record.id));
        dispatch(fetchCandidateDetailThunk(record.id));
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>Interview performance overview</Text>
                    <Space.Compact style={{ width: '100%' }}>
                        <Input.Search
                            value={search}
                            onChange={(event) => dispatch(setSearch(event.target.value))}
                            placeholder="Search candidates by name or email"
                            allowClear
                        />
                        <Button onClick={() => dispatch(fetchCandidatesThunk({ search, sortField, sortOrder }))}>
                            Refresh
                        </Button>
                    </Space.Compact>
                </Space>
            </Card>

            <CandidateTable
                items={items}
                loading={loading}
                onSelect={handleSelectCandidate}
                onSortChange={({ field, order }) => dispatch(setSort({ field, order }))}
            />

            <CandidateDetailDrawer
                open={Boolean(selectedId)}
                candidate={selectedDetail}
                onClose={() => dispatch(clearSelectedCandidate())}
            />
        </Space>
    );
}
