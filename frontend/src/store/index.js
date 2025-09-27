import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import sessionReducer from './sessionSlice';
import candidatesReducer from './candidatesSlice';
import uiReducer from './uiSlice';

const rootReducer = combineReducers({
    session: sessionReducer,
    candidates: candidatesReducer,
    ui: uiReducer,
});

const persistConfig = {
    key: 'interview-assistant',
    storage,
    whitelist: ['session', 'ui'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }),
});

export const persistor = persistStore(store);

export const selectSession = (state) => state.session;
export const selectCandidates = (state) => state.candidates;
export const selectUi = (state) => state.ui;
