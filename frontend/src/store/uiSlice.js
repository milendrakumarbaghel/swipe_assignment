import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    activeTab: 'interviewee',
    welcomeBackVisible: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setActiveTab(state, action) {
            state.activeTab = action.payload;
        },
        showWelcomeBack(state) {
            state.welcomeBackVisible = true;
        },
        hideWelcomeBack(state) {
            state.welcomeBackVisible = false;
        },
    },
});

export const { setActiveTab, showWelcomeBack, hideWelcomeBack } = uiSlice.actions;

export default uiSlice.reducer;
