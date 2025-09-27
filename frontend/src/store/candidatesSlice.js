import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchCandidates, fetchCandidateDetail } from '../api/candidateApi';

export const fetchCandidatesThunk = createAsyncThunk(
    'candidates/fetchAll',
    async (params = {}) => {
        const data = await fetchCandidates(params);
        return data.candidates;
    }
);

export const fetchCandidateDetailThunk = createAsyncThunk(
    'candidates/fetchDetail',
    async (candidateId) => {
        const data = await fetchCandidateDetail(candidateId);
        return data.candidate;
    }
);

const initialState = {
    items: [],
    loading: false,
    error: null,
    search: '',
    sortField: 'finalScore',
    sortOrder: 'desc',
    selectedId: null,
    selectedDetail: null,
};

const candidatesSlice = createSlice({
    name: 'candidates',
    initialState,
    reducers: {
        setSearch(state, action) {
            state.search = action.payload;
        },
        setSort(state, action) {
            state.sortField = action.payload.field;
            state.sortOrder = action.payload.order;
        },
        setSelectedCandidate(state, action) {
            state.selectedId = action.payload;
        },
        clearSelectedCandidate(state) {
            state.selectedId = null;
            state.selectedDetail = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCandidatesThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCandidatesThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchCandidatesThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Failed to load candidates';
            })
            .addCase(fetchCandidateDetailThunk.pending, (state) => {
                state.error = null;
            })
            .addCase(fetchCandidateDetailThunk.fulfilled, (state, action) => {
                state.selectedDetail = action.payload;
            })
            .addCase(fetchCandidateDetailThunk.rejected, (state, action) => {
                state.error = action.error?.message || 'Failed to load candidate detail';
            });
    },
});

export const { setSearch, setSort, setSelectedCandidate, clearSelectedCandidate } = candidatesSlice.actions;

export default candidatesSlice.reducer;
