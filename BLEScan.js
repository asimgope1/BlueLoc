import React, {useState, useEffect, useCallback} from 'react';
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
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {Buffer} from 'buffer';
import DeviceList from './DeviceList';
import RadarAnimation from './RadarAnimation';

const BLEScan = () => {
  const [scanning, setScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCharacteristic, setSelectedCharacteristic] = useState(null);

  const {width: WIDTH} = Dimensions.get('window');

  useEffect(() => {
    const enableBluetooth = async () => {
      try {
        await BleManager.enableBluetooth();
        console.log('Bluetooth is enabled');
      } catch (error) {
        Alert.alert(
          'Bluetooth Required',
          'Please enable Bluetooth to use this app.',
        );
      }
    };

    BleManager.start({showAlert: false});
    requestPermissions();
    enableBluetooth();

    const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);

    const discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );
    const stopListener = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      handleStopScan,
    );
    const disconnectListener = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );

    return () => {
      discoverListener.remove();
      stopListener.remove();
      disconnectListener.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const allGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        Alert.alert(
          'Permission Required',
          'Please grant all permissions to use Bluetooth features.',
        );
      }
    }
  };

  const handleDiscoverPeripheral = async peripheral => {
    if (peripheral?.name !== 'HR_9D') return;

    console.log('🛰️ Found HR_9D:', peripheral);
    setDevices([peripheral]);

    try {
      // await BleManager.connect(peripheral.id);
      // console.log('✅ Connected to HR_9D');

      // 🔧 Small delay before retrieving services
      await new Promise(resolve => setTimeout(resolve, 1000));

      const servicesData = await BleManager.retrieveServices(peripheral.id);
      console.log('📡 All Services:', servicesData.services);
      console.log('🧬 All Characteristics:', servicesData.characteristics);

      const otaCandidates = servicesData.services.filter(service =>
        /ota|dfu|update/i.test(service.uuid),
      );

      if (otaCandidates.length > 0) {
        console.log('🔥 Possible OTA Services:', otaCandidates);
        Alert.alert('OTA Service Found', JSON.stringify(otaCandidates));
      } else {
        console.log('❌ No obvious OTA service found');
        Alert.alert(
          'No OTA Service Found',
          'Could not detect OTA update support.',
        );
      }
    } catch (error) {
      console.error('Connection or retrieval failed:', error);
      Alert.alert('Error', 'Failed to connect or retrieve services.');
    }
  };

  // Dummy function to perform OTA update (replace with actual logic)
  const performOTAUpdate = async (
    deviceId,
    otaCharacteristic,
    firmwareData,
  ) => {
    try {
      const chunkSize = 512; // Adjust based on device specs
      let offset = 0;

      // Write firmware in chunks
      while (offset < firmwareData.length) {
        const chunk = firmwareData.slice(offset, offset + chunkSize);
        await BleManager.write(
          deviceId,
          otaCharacteristic.service,
          otaCharacteristic.uuid,
          chunk,
        );
        offset += chunkSize;
        console.log('Sent chunk:', chunk);
      }

      // After sending all chunks, you might need to trigger a final step (e.g., activation or reboot)
      console.log('Firmware update complete');
      Alert.alert('Success', 'Firmware update complete!');
    } catch (error) {
      console.warn('Error during OTA update:', error);
      Alert.alert('Error', 'Firmware update failed!');
    }
  };

  const handleStopScan = () => {
    console.log('Scan stopped');
    setScanning(false);
    setIsSearching(false);
  };

  const handleDisconnectedPeripheral = data => {
    Alert.alert('Disconnected', `Disconnected from device ${data.peripheral}`);
    resetConnection();
  };

  const resetConnection = () => {
    setConnectedDevice(null);
    setServices([]);
    setCharacteristics([]);
  };

  const scanAndConnect = useCallback(() => {
    console.log('Starting scan');
    setIsSearching(true);
    setScanning(true);
    setDevices([]);
    BleManager.scan([], 15, true).catch(error =>
      console.warn('Error during scan:', error),
    );
  }, []);

  useEffect(() => {
    scanAndConnect();
  }, [scanAndConnect]);

  useEffect(() => {
    const handler = BleManager.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      ({value, peripheral, characteristic, service}) => {
        const data = Buffer.from(value).toString('hex'); // or 'utf8' or raw
        console.log(
          `📨 Notification from ${peripheral} → ${characteristic}:`,
          data,
        );
      },
    );

    return () => handler.remove();
  }, []);

  const connectToDevice = useCallback(
    async device => {
      const deviceId = device.id;
      const deviceName =
        device.name || device.advertising?.localName || 'Unknown';
      setIsLoading(true);

      try {
        if (connectedDevice === deviceId) {
          console.log('🔌 Already connected. Disconnecting...');
          await BleManager.disconnect(deviceId);
          resetConnection();
          return;
        }

        console.log(`🔗 Connecting to ${deviceId}...`);
        await BleManager.connect(deviceId);

        // Android bonding (if required)
        if (Platform.OS === 'android' && device.bonded !== true) {
          try {
            await BleManager.createBond(deviceId);
            console.log('🔐 Bonding successful');
          } catch (bondErr) {
            console.warn('⚠️ Bonding failed:', bondErr.message);
          }
        }

        setConnectedDevice(deviceId);
        console.log('✅ Connected to', deviceId);

        // Android MTU Request
        if (Platform.OS === 'android') {
          try {
            const mtu = await BleManager.requestMTU(deviceId, 180);
            console.log('📶 Requested MTU:', mtu);
          } catch (err) {
            console.warn('⚠️ MTU request failed:', err.message);
          }
        }

        // Retrieve GATT Services & Characteristics
        const servicesData = await BleManager.retrieveServices(deviceId);
        console.log(
          '📡 Services:',
          servicesData.services.map(s => s.uuid),
        );
        console.log('🧬 Characteristics:', servicesData.characteristics);

        setServices(servicesData.services);
        setCharacteristics(servicesData.characteristics);

        // Automatically subscribe to notify characteristic (example: Heart Rate 2A37)
        const hrChar = servicesData.characteristics.find(
          c =>
            c.service.toLowerCase() === '180d' &&
            c.characteristic.toLowerCase() === '2a37' &&
            c.properties?.includes('Notify'),
        );

        if (hrChar) {
          await BleManager.startNotification(
            deviceId,
            hrChar.service,
            hrChar.characteristic,
          );
          console.log('🔔 Subscribed to Heart Rate notifications (0x2A37)');
        }

        Alert.alert('Connected', `Connected to ${deviceId}`);
      } catch (error) {
        console.warn(
          '❌ Connection or service discovery failed:',
          error.message,
        );

        if (error.message?.includes('Device disconnected')) {
          console.log('🔁 Attempting cache refresh...');
          try {
            await BleManager.refreshCache(deviceId);
          } catch (refreshErr) {
            console.warn('⚠️ Cache refresh failed:', refreshErr.message);
          }
        }

        Alert.alert('Error', 'Failed to connect or retrieve services.');
        resetConnection();
      } finally {
        setIsLoading(false);
      }
    },
    [connectedDevice],
  );

  const fetchServices = useCallback(async deviceId => {
    try {
      const servicesData = await BleManager.retrieveServices(deviceId);
      const filteredCharacteristics = servicesData.characteristics.filter(
        char => char.service !== '1800' && char.service !== '1801',
      );
      setServices(servicesData.services);
      setCharacteristics(filteredCharacteristics);
    } catch (error) {
      console.warn('Error fetching services:', error);
    }
  }, []);

  const readCharacteristic = async (serviceUUID, characteristicUUID) => {
    try {
      const readData = await BleManager.read(
        connectedDevice,
        serviceUUID,
        characteristicUUID,
      );
      const buffer = Buffer.from(readData);
      const decodedValue = buffer.toString('utf-8');
      console.log('Read value:', decodedValue);
      return decodedValue;
    } catch (error) {
      console.error('Failed to read characteristic:', error);
      Alert.alert('Error', 'Failed to read characteristic.');
    }
  };

  const writeCharacteristic = useCallback(
    async (characteristicUUID, deviceId, serviceUUID, value) => {
      if (!characteristicUUID || !value || !deviceId) {
        Alert.alert('Error', 'Characteristic, device, or value missing.');
        return;
      }

      try {
        const byteArray = Array.from(value).map(char => char.charCodeAt(0));
        await BleManager.writeWithoutResponse(
          deviceId,
          serviceUUID,
          characteristicUUID,
          byteArray,
          512,
        );
        Alert.alert('Success', 'Value written successfully');
      } catch (error) {
        console.warn('Write error:', error);
        Alert.alert('Error', `Write failed: ${error.message}`);
      }
    },
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {isSearching ? (
            <RadarAnimation />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Bluelocate</Text>
                <TouchableOpacity
                  onPress={scanAndConnect}
                  style={styles.rescanButton}>
                  <Text style={styles.rescanText}>Rescan</Text>
                </TouchableOpacity>
              </View>

              <DeviceList
                devices={devices}
                onConnect={connectToDevice}
                onViewDetails={device =>
                  Alert.alert('Device Details', JSON.stringify(device))
                }
                onRead={readCharacteristic}
                onWrite={writeCharacteristic}
                isConnecting={isLoading}
                connectedDevice={connectedDevice}
                services={services}
                characteristics={characteristics}
                setSelectedCharacteristic={setSelectedCharacteristic}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter value to write"
                value={inputValue}
                onChangeText={setInputValue}
              />

              <Modal
                transparent={true}
                animationType="fade"
                visible={isLoading}>
                <View style={styles.modalOverlay}>
                  <ActivityIndicator size="large" color="#007AFF" />
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  rescanButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  rescanText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 10,
    padding: 15,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BLEScan;
