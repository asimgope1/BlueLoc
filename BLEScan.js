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
                    Alert.alert('Permission Required', 'Please grant all permissions to use Bluetooth features.');
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
            const deviceId = device.id;
            setIsLoading(true);
            try {
                if (connectedDevice === deviceId) {
                    await BleManager.disconnect(deviceId);
                    setConnectedDevice(null);
                    setServices([]);
                    setCharacteristics([]);
                    fetchServices(deviceId);
                } else {
                    await BleManager.connect(deviceId);
                    setConnectedDevice(deviceId);
                    fetchServices(deviceId);
                    Alert.alert('Connected', `Successfully connected to device ${deviceId}`);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to connect to device.');
            } finally {
                setIsLoading(false);
            }
        },
        [connectedDevice]
    );

    const fetchServices = useCallback(
        async (deviceId) => {
            try {
                const servicesData = await BleManager.retrieveServices(deviceId);
                const filteredCharacteristics = servicesData.characteristics.filter(
                    (char) => char.service !== '1800' && char.service !== '1801'
                );
                setServices(servicesData.services);
                console.log('servicesData.services', servicesData.services, 'filteredCharacteristics', filteredCharacteristics)
                setCharacteristics(filteredCharacteristics);
            } catch (error) {
                console.warn('Error fetching services:', error);
            }
        },
        []
    );


    const readCharacteristic = async (serviceUUID, characteristicUUID) => {
        try {
            const value = await connectedDevice.readCharacteristicForService(
                serviceUUID,
                characteristicUUID
            );
            return value ? value.value : null;
        } catch (error) {
            console.error('Failed to read characteristic:', error);
            return null;
        }
    };

    // Write characteristic value
    const writeCharacteristic = async (serviceUUID, characteristicUUID, inputValue) => {
        console.log('Attempting to write characteristic');
        console.log('serviceUUID:', serviceUUID);
        console.log('characteristicUUID:', characteristicUUID);
        console.log('inputValue:', inputValue);

        try {
            const encodedValue = Buffer.from(inputValue).toString('base64'); // Encode input value to Base64
            console.log('Encoded value:', encodedValue);

            await connectedDevice.writeCharacteristicWithResponseForService(
                serviceUUID,
                characteristicUUID,
                encodedValue
            );

            console.log('Successfully written:', inputValue);
        } catch (error) {
            console.error('Failed to write characteristic:', error);
        }
    };


    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
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
                            </View>

                            <DeviceList
                                devices={devices}
                                onConnect={connectToDevice}
                                onViewDetails={(device) => Alert.alert('Device Details', JSON.stringify(device))}
                                onRead={readCharacteristic}
                                onWrite={writeCharacteristic}
                                isConnecting={isLoading}
                                connectedDevice={connectedDevice}
                                services={services}
                                characteristics={characteristics}
                            />
                            {isWriting && <ActivityIndicator size="large" color="#0000ff" />}
                        </>
                    )}
                    {isLoading && (
                        <Modal transparent={true} animationType="fade" visible={isLoading}>
                            <View style={styles.modalOverlay}>
                                <ActivityIndicator size="large" color="#007AFF" />
                            </View>
                        </Modal>
                    )}
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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
});

export default BLEScan;
