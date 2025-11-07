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
  TextInput,
  BackHandler,
} from 'react-native';
import DeviceList1 from './DeviceList1';
import RadarAnimation from './RadarAnimation';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';

const NALCO_COLORS = {
  primary: '#A62C2B',     // NALCO Red
  secondary: '#4E4E4E',   // Steel Gray
  accent: '#E5B73B',      // Gold
  background: '#F8F8F8',  // Light background
  white: '#FFFFFF',
};

const BluetoothScanner = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCharacteristic, setSelectedCharacteristic] = useState(null);

  const { width: WIDTH } = Dimensions.get('window');

  useEffect(() => {
    const backAction = () => {
      Alert.alert('Exit Writing', 'Are you sure you want to exit?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => navigation.goBack() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const enableBluetooth = async () => {
      try {
        await BleManager.enableBluetooth();
      } catch (error) {
        Alert.alert('Bluetooth Required', 'Please enable Bluetooth to use this app.');
      }
    };

    BleManager.start({ showAlert: false });
    requestPermissions();
    enableBluetooth();

    const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
    const discoverListener = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    const stopListener = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    const disconnectListener = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);

    return () => {
      discoverListener.remove();
      stopListener.remove();
      disconnectListener.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  const handleDiscoverPeripheral = (peripheral) => {
    if (peripheral && peripheral.name === 'EPSUMLABS') {
      setDevices((prev) =>
        prev.find((d) => d.id === peripheral.id) ? prev : [...prev, peripheral],
      );
    }
  };

  const handleStopScan = () => {
    setScanning(false);
    setIsSearching(false);
  };

  const handleDisconnectedPeripheral = (data) => {
    Alert.alert('Disconnected', `Device ${data.peripheral} disconnected`);
    resetConnection();
  };

  const resetConnection = () => {
    setConnectedDevice(null);
    setServices([]);
    setCharacteristics([]);
  };

  const scanAndConnect = useCallback(() => {
    setIsSearching(true);
    setScanning(true);
    setDevices([]);
    BleManager.scan([], 15, true).catch(console.warn);
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
          resetConnection();
        } else {
          await BleManager.connect(deviceId);
          setConnectedDevice(deviceId);
          fetchServices(deviceId);
          Alert.alert('Connected', `Connected to ${deviceId}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to connect.');
      } finally {
        setIsLoading(false);
      }
    },
    [connectedDevice],
  );

  const fetchServices = useCallback(async (deviceId) => {
    try {
      const data = await BleManager.retrieveServices(deviceId);
      const chars = data.characteristics.filter(
        (c) => c.service !== '1800' && c.service !== '1801',
      );
      setServices(data.services);
      setCharacteristics(chars);
    } catch (e) {
      console.warn('Service fetch error:', e);
    }
  }, []);

  const readCharacteristic = async (serviceUUID, characteristicUUID) => {
    try {
      const readData = await BleManager.read(connectedDevice, serviceUUID, characteristicUUID);
      const buffer = Buffer.from(readData);
      const value = buffer.toString('utf-8');
      console.log('Read:', value);
      return value;
    } catch (e) {
      Alert.alert('Error', 'Failed to read characteristic.');
    }
  };

  const writeCharacteristic = useCallback(async (char, device, service, value) => {
    if (!char || !value || !device) {
      Alert.alert('Error', 'Missing parameters.');
      return;
    }
    setIsLoading(true);
    try {
      const bytes = Array.from(value).map((ch) => ch.charCodeAt(0));
      await BleManager.writeWithoutResponse(device, service, char, bytes, 512);
    } catch (e) {
      Alert.alert('Error', `Write failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NALCO_COLORS.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {isSearching ? (
            <RadarAnimation color={NALCO_COLORS.primary} />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>NALCO Bluelocate</Text>
                {!isSearching && (
                  <TouchableOpacity onPress={scanAndConnect} style={styles.rescanButton}>
                    <Text style={styles.rescanText}>Rescan</Text>
                  </TouchableOpacity>
                )}
              </View>

              <DeviceList1
                devices={devices}
                onConnect={connectToDevice}
                onViewDetails={(device) => Alert.alert('Device Details', JSON.stringify(device))}
                onRead={readCharacteristic}
                onWrite={writeCharacteristic}
                isConnecting={isLoading}
                connectedDevice={connectedDevice}
                services={services}
                characteristics={characteristics}
                setSelectedCharacteristic={setSelectedCharacteristic}
              />

           

              <Modal transparent animationType="fade" visible={isLoading}>
                <View style={styles.modalOverlay}>
                  <ActivityIndicator size="large" color={NALCO_COLORS.accent} />
                </View>
              </Modal>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NALCO_COLORS.background,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: NALCO_COLORS.primary,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: NALCO_COLORS.white,
    letterSpacing: 0.5,
  },
  rescanButton: {
    backgroundColor: NALCO_COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  rescanText: {
    color: NALCO_COLORS.primary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: NALCO_COLORS.white,
    borderRadius: 8,
    margin: 12,
    padding: 15,
    fontSize: 16,
    borderColor: NALCO_COLORS.primary,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BluetoothScanner;
