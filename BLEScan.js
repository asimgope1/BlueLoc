import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Alert,
    StyleSheet,
    PermissionsAndroid,
    Dimensions,
    NativeEventEmitter,
    NativeModules,
    ActivityIndicator,
    Button,
    TouchableOpacity,
    KeyboardAvoidingView,
    StatusBar,
    Platform,
    ScrollView,
    Modal,
} from 'react-native';
import DeviceList from './DeviceList';
import RadarAnimation from './RadarAnimation'; // Import RadarAnimation component
import BleManager from 'react-native-ble-manager';

const BLEScan = () => {
    const [scanning, setScanning] = useState(false);
    const [isSearching, setIsSearching] = useState(true);
    const [devices, setDevices] = useState([]);
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [services, setServices] = useState([]);
    const [characteristics, setCharacteristics] = useState([]);
    const [isWriting, setIsWriting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const { width: WIDTH } = Dimensions.get('window');

    useEffect(() => {
        BleManager.start({ showAlert: false });

        const requestPermissions = async () => {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);

                if (
                    Object.values(granted).some((permission) => permission !== PermissionsAndroid.RESULTS.GRANTED)
                ) {
                    // Alert.alert('Permission Required', 'Please grant all permissions to use Bluetooth features.');
                }
            }
        };

        requestPermissions();

        const handleDiscoverPeripheral = (peripheral) => {
            if (peripheral && peripheral.name) {
                setDevices((prevDevices) => {
                    if (!prevDevices.find((d) => d.id === peripheral.id)) {
                        return [...prevDevices, peripheral];
                    }
                    return prevDevices;
                });
            }
        };

        const handleStopScan = () => {
            console.log('Scan stopped');
            setScanning(false);
            setIsSearching(false);
        };

        const handleDisconnectedPeripheral = (data) => {
            Alert.alert('Disconnected', `Disconnected from device ${data.peripheral}`);
            setConnectedDevice(null);
            setServices([]);
            setCharacteristics([]);
        };

        const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);

        const discoverListener = bleManagerEmitter.addListener(
            'BleManagerDiscoverPeripheral',
            handleDiscoverPeripheral
        );
        const stopListener = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
        const disconnectListener = bleManagerEmitter.addListener(
            'BleManagerDisconnectPeripheral',
            handleDisconnectedPeripheral
        );

        return () => {
            discoverListener.remove();
            stopListener.remove();
            disconnectListener.remove();
        };
    }, []);

    const scanAndConnect = useCallback(() => {
        console.log('Starting scan');
        setIsSearching(true);
        setScanning(true);
        setDevices([]); // Clear previous scan results
        BleManager.scan([], 10, true).catch((error) => console.warn('Error during scan:', error));
    }, []);

    useEffect(() => {
        scanAndConnect();
    }, [scanAndConnect]);

    const connectToDevice = useCallback(
        async (device) => {
            const deviceId = device.id; // Extract the device ID
            setIsLoading(true); // Set loading state to true
            try {
                if (connectedDevice === deviceId) {
                    // Already connected, so disconnect
                    await BleManager.disconnect(deviceId);
                    console.log('Disconnected from device:', deviceId);
                    setConnectedDevice(null);
                    setServices([]);
                    setCharacteristics([]);
                } else {
                    await BleManager.connect(deviceId);
                    console.log('Connected to device:', deviceId);
                    setConnectedDevice(deviceId);
                    fetchServices(deviceId);
                    Alert.alert('Connected', `Successfully connected to device ${deviceId}`);
                }
            } catch (error) {
                console.warn('Error connecting to device:', error);
                Alert.alert('Error', 'Failed to connect to device.');
            } finally {
                setIsLoading(false); // Set loading state to false regardless of success or failure
            }
        },
        [connectedDevice] // Dependency array to ensure latest connectedDevice state is used
    );


    const fetchServices = useCallback(
        async (deviceId) => {
            try {
                const servicesData = await BleManager.retrieveServices(deviceId);
                console.log('Services Data:', servicesData); // Log the complete services data

                const filteredCharacteristics = servicesData.characteristics.filter(
                    (char) => char.service !== '1800' && char.service !== '1801'
                );
                setServices(servicesData.services);
                setCharacteristics(filteredCharacteristics);

                console.log('Services:', servicesData.services); // Log just the services
                console.log('Characteristics:', filteredCharacteristics); // Log filtered characteristics
            } catch (error) {
                console.warn('Error fetching services:', error);
            }
        },
        []
    );

    console.log('devices', devices)
    return (
        <View style={styles.container}>
            {/* StatusBar for custom appearance */}
            <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

            {/* KeyboardAvoidingView to handle keyboard interactions */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                {/* ScrollView to allow scrolling if needed */}
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    {/* Main content */}
                    {isSearching ? (
                        <RadarAnimation />
                    ) : (
                        <>
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Bluelocate</Text>
                                {!isSearching && (
                                    <TouchableOpacity onPress={scanAndConnect} style={styles.rescanButton}>
                                        <Text style={styles.rescanText}>Rescan</Text>
                                    </TouchableOpacity>
                                )}
                                {isLoading ? (
                                    <Modal
                                        transparent={true}
                                        animationType="fade"
                                        visible={isLoading}
                                        onRequestClose={() => setIsLoading(false)} // Optional: Handle back button
                                    >
                                        <View style={styles.modalOverlay}>
                                            <ActivityIndicator size="large" color="#007AFF" />
                                        </View>
                                    </Modal>
                                ) : <></>}
                            </View>



                            <DeviceList
                                devices={devices}
                                onConnect={connectToDevice} // Pass the updated connectToDevice function
                                isConnecting={scanning}
                                connectedDevice={connectedDevice} // Pass the connected device
                            />


                        </>
                    )}
                    {isWriting && <ActivityIndicator size="large" color="#0000ff" />}
                </ScrollView>


            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#007AFF',
        width: '100%',
        height: 60,
    },
    headerTitle: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
    },
    rescanButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#ffffff',
        borderRadius: 5,
    },
    rescanText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: 'bold',
    },
});

export default BLEScan;
