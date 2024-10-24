// bluetoothSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    connectedDevice: null,
    services: [],
    characteristics: [],
    isConnecting: false,
};

const bluetoothSlice = createSlice({
    name: 'bluetooth',
    initialState,
    reducers: {
        connectDevice(state, action) {
            state.connectedDevice = action.payload;
            state.isConnecting = false;
        },
        disconnectDevice(state) {
            state.connectedDevice = null;
            state.services = [];
            state.characteristics = [];
            state.isConnecting = false;
        },
        setServices(state, action) {
            state.services = action.payload;
        },
        setCharacteristics(state, action) {
            state.characteristics = action.payload;
        },
        startConnecting(state) {
            state.isConnecting = true;
        },
        stopConnecting(state) {
            state.isConnecting = false;
        },
    },
});

export const {
    connectDevice,
    disconnectDevice,
    setServices,
    setCharacteristics,
    startConnecting,
    stopConnecting,
} = bluetoothSlice.actions;

export default bluetoothSlice.reducer;
