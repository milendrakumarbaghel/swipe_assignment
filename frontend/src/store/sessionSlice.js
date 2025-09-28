import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { uploadResume } from '../api/resumeApi';
import { startInterview, submitAnswer, fetchSession, finalizeSession } from '../api/interviewApi';
import { timeLimits } from '../utils/interviewConfig';

function computeMissingFields(candidate) {
    const missing = [];
    if (!candidate.name?.trim()) missing.push('name');
    if (!candidate.email?.trim()) missing.push('email');
    if (!candidate.phone?.trim()) missing.push('phone');
    return missing;
}

function buildTimer(question) {
    if (!question) return { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
    const duration = timeLimits[question.difficulty] || 60;
    const startedAt = dayjs().toISOString();
    return {
        questionId: question.id,
        startedAt,
        duration,
        expiresAt: dayjs(startedAt).add(duration, 'second').toISOString(),
        pausedAt: null,
    };
}

function nextQuestionFromSession(session) {
    if (!session) return null;
    const { currentQuestionIndex, questions } = session;
    return questions.find((q) => q.order === currentQuestionIndex);
}

export const uploadResumeThunk = createAsyncThunk('session/uploadResume', async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    const data = await uploadResume(formData);
    return data;
});

export const startInterviewThunk = createAsyncThunk(
    'session/startInterview',
    async ({ candidate, resume, resumeText }, { getState }) => {
        const state = getState().session;
        const payload = {
            candidate,
            resume,
            resumeText,
        };

        if (!payload.resume && state.resume) {
            payload.resume = state.resume;
        }

        if (!payload.resumeText && state.resumeText) {
            payload.resumeText = state.resumeText;
        }

        const data = await startInterview(payload);
        return data.session;
    }
);

export const resumeSessionThunk = createAsyncThunk('session/resumeSession', async (sessionId) => {
    const data = await fetchSession(sessionId);
    return data.session;
});

export const submitAnswerThunk = createAsyncThunk(
    'session/submitAnswer',
    async ({ sessionId, answer }, { getState }) => {
        const { timer } = getState().session;
        const payload = {
            questionId: answer.questionId,
            answerText: answer.answerText,
            timeTakenSeconds: answer.timeTakenSeconds ?? 0,
            autoSubmitted: Boolean(answer.autoSubmitted),
        };

        if (timer?.questionId === answer.questionId && timer?.startedAt) {
            const elapsed = dayjs().diff(dayjs(timer.startedAt), 'second');
            payload.timeTakenSeconds = Math.max(elapsed, payload.timeTakenSeconds);
        }

        const data = await submitAnswer(sessionId, payload);
        return data;
    }
);

export const finalizeSessionThunk = createAsyncThunk('session/finalize', async (sessionId) => {
    const data = await finalizeSession(sessionId);
    return data.session;
});

const initialState = {
    status: 'idle',
    candidate: {
        name: '',
        email: '',
        phone: '',
    },
    resume: null,
    resumeText: '',
    session: null,
    missingFields: ['name', 'email', 'phone'],
    loading: false,
    error: null,
    pendingAction: null,
    timer: {
        questionId: null,
        startedAt: null,
        duration: null,
        expiresAt: null,
        pausedAt: null,
    },
    welcomeBackPrompted: false,
};

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        updateCandidateField(state, action) {
            const { field, value } = action.payload;
            state.candidate[field] = value;
            state.missingFields = computeMissingFields(state.candidate);
        },
        resetSessionState() {
            return initialState;
        },
        markWelcomeBackSeen(state) {
            state.welcomeBackPrompted = true;
        },
        markTimerPaused(state) {
            if (state.timer.questionId) {
                state.timer.pausedAt = dayjs().toISOString();
                state.status = 'paused';
            }
        },
        markTimerResumed(state) {
            if (state.timer.questionId && state.timer.pausedAt) {
                const pausedDuration = dayjs().diff(dayjs(state.timer.pausedAt), 'second');
                state.timer.startedAt = dayjs(state.timer.startedAt).add(pausedDuration, 'second').toISOString();
                state.timer.expiresAt = dayjs(state.timer.expiresAt).add(pausedDuration, 'second').toISOString();
                state.timer.pausedAt = null;
                state.status = 'active';
            }
        },
        hydrateFromSession(state, action) {
            state.session = action.payload;
            const question = nextQuestionFromSession(state.session);
            if (question) {
                const existingAnswer = state.session.answers.find((ans) => ans.questionId === question.id);
                if (!existingAnswer) {
                    state.timer = buildTimer(question);
                } else {
                    state.timer = { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
                }
            } else {
                state.timer = { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(uploadResumeThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.pendingAction = 'uploadResume';
            })
            .addCase(uploadResumeThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingAction = null;
                const { candidate, resume, resumeText } = action.payload;
                state.resume = resume;
                state.resumeText = resumeText;
                state.candidate = {
                    ...state.candidate,
                    ...candidate,
                };
                state.missingFields = computeMissingFields(state.candidate);
                state.status = state.missingFields.length ? 'collecting' : 'ready';
            })
            .addCase(uploadResumeThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Failed to process resume';
                state.pendingAction = null;
            })
            .addCase(startInterviewThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.pendingAction = 'startInterview';
            })
            .addCase(startInterviewThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingAction = null;
                state.session = action.payload;
                state.status = 'active';
                const currentQuestion = nextQuestionFromSession(state.session);
                state.timer = buildTimer(currentQuestion);
            })
            .addCase(startInterviewThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Failed to start interview';
                state.pendingAction = null;
            })
            .addCase(resumeSessionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.pendingAction = 'resumeSession';
            })
            .addCase(resumeSessionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingAction = null;
                state.session = action.payload;
                state.status = action.payload.status === 'COMPLETED' ? 'completed' : 'active';
                const currentQuestion = nextQuestionFromSession(state.session);
                if (currentQuestion && action.payload.status !== 'COMPLETED') {
                    if (state.timer.questionId === currentQuestion.id && state.timer.startedAt) {
                        state.timer = { ...state.timer };
                    } else {
                        state.timer = buildTimer(currentQuestion);
                    }
                } else {
                    state.timer = { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
                }
            })
            .addCase(resumeSessionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Failed to resume session';
                state.pendingAction = null;
            })
            .addCase(submitAnswerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.pendingAction = 'submitAnswer';
            })
            .addCase(submitAnswerThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingAction = null;
                const { session, nextQuestion } = action.payload;
                state.session = session;
                if (nextQuestion) {
                    state.timer = buildTimer(nextQuestion);
                    state.status = 'active';
                } else {
                    state.timer = { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
                    state.status = 'completed';
                }
            })
            .addCase(submitAnswerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error?.message || 'Failed to submit answer';
                state.pendingAction = null;
            })
            .addCase(finalizeSessionThunk.pending, (state) => {
                state.pendingAction = 'finalizeSession';
                state.error = null;
            })
            .addCase(finalizeSessionThunk.fulfilled, (state, action) => {
                state.session = action.payload;
                state.status = 'completed';
                state.timer = { questionId: null, startedAt: null, duration: null, expiresAt: null, pausedAt: null };
                state.pendingAction = null;
            })
            .addCase(finalizeSessionThunk.rejected, (state, action) => {
                state.pendingAction = null;
                state.error = action.error?.message || 'Failed to finalize session';
            });
    },
});

export const {
    updateCandidateField,
    resetSessionState,
    markWelcomeBackSeen,
    markTimerPaused,
    markTimerResumed,
    hydrateFromSession,
} = sessionSlice.actions;

export default sessionSlice.reducer;
