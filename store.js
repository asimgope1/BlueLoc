// store.js
import { configureStore } from '@reduxjs/toolkit';
import bluetoothReducer from './bluetoothSlice';

const store = configureStore({
    reducer: {
        bluetooth: bluetoothReducer,
    },
});

export default store;
