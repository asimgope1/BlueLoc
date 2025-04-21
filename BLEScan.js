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
import DeviceList from './DeviceList';
import RadarAnimation from './RadarAnimation';
import BleManager from 'react-native-ble-manager';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';

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
  const binFilePath = `${RNFS.DocumentDirectoryPath}/ble_data.bin`;

  const {width: WIDTH} = Dimensions.get('window');

  // 🔥 Initialize BLE and request permissions
  useEffect(() => {
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

  // 🛑 Request BLE permissions (Android)
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      if (
        Object.values(granted).some(
          permission => permission !== PermissionsAndroid.RESULTS.GRANTED,
        )
      ) {
        Alert.alert(
          'Permission Required',
          'Please grant all permissions to use Bluetooth features.',
        );
      }
    }
  };

  // ✅ Enable Bluetooth
  const enableBluetooth = async () => {
    try {
      await BleManager.enableBluetooth();
      console.log('✅ Bluetooth is enabled');
    } catch (error) {
      Alert.alert(
        'Bluetooth Required',
        'Please enable Bluetooth to use this app.',
      );
    }
  };

  // 🎯 Discover BLE devices
  const handleDiscoverPeripheral = peripheral => {
    if (peripheral) {
      saveToBinFile(peripheral.advertising.rawData.bytes, 'Advertising Data');
      setDevices(prevDevices => {
        if (!prevDevices.find(d => d.id === peripheral.id)) {
          return [...prevDevices, peripheral];
        }
        return prevDevices;
      });
    }
  };

  // ⏹️ Stop BLE scanning
  const handleStopScan = () => {
    console.log('🔍 Scan stopped');
    setScanning(false);
    setIsSearching(false);
  };

  // ❗ Handle disconnection (No Auto Reconnect)
  const handleDisconnectedPeripheral = async data => {
    Alert.alert('Disconnected', `Disconnected from device ${data.peripheral}`);
    resetConnection();
  };

  // ♻️ Reset connection state
  const resetConnection = () => {
    setConnectedDevice(null);
    setServices([]);
    setCharacteristics([]);
  };

  // 📡 Start scanning
  const scanAndConnect = useCallback(() => {
    console.log('🔍 Starting scan');
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

  // 🔗 Connect to selected device (Manual Only)
  const connectToDevice = useCallback(
    async device => {
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
          Alert.alert(
            'Connected',
            `Successfully connected to device ${deviceId}`,
          );
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to connect to device.');
      } finally {
        setIsLoading(false);
      }
    },
    [connectedDevice],
  );

  // 📡 Fetch services and characteristics
  const fetchServices = useCallback(async deviceId => {
    try {
      const servicesData = await BleManager.retrieveServices(deviceId);
      console.log('services data: ', JSON.stringify(servicesData, null, 2));
      saveToBinFile(servicesData.characteristics, 'Characteristics Data');

      const filteredCharacteristics = servicesData.characteristics.filter(
        char => char.service !== '1800' && char.service !== '1801',
      );
      setServices(servicesData.services);
      setCharacteristics(filteredCharacteristics);
    } catch (error) {
      console.warn('Error fetching services:', error);
    }
  }, []);

  // 📖 Read characteristic
  const readCharacteristic = async (serviceUUID, characteristicUUID) => {
    try {
      const readData = await BleManager.read(
        connectedDevice,
        serviceUUID,
        characteristicUUID,
      );
      saveToBinFile(readData, 'Read Characteristic Data');

      const buffer = Buffer.from(readData);
      const decodedValue = buffer.toString('utf-8');
      Alert.alert('Read Value', `Value: ${decodedValue}`);
    } catch (error) {
      console.error('Failed to read characteristic:', error);
    }
  };

  // ✍️ Write to characteristic
  const writeCharacteristic = useCallback(
    async (serviceUUID, characteristicUUID, inputValue) => {
      if (!characteristicUUID || !inputValue || !connectedDevice) {
        Alert.alert('Error', 'No characteristic or value provided.');
        return;
      }

      try {
        const byteArray = textStringToAsciiArray(inputValue.toString());
        saveToBinFile(byteArray, 'Written Characteristic Data');

        await BleManager.writeWithoutResponse(
          connectedDevice,
          serviceUUID,
          characteristicUUID,
          byteArray,
          512,
        );
        Alert.alert('Success', 'Value written successfully');
      } catch (error) {
        console.warn('Error writing characteristic:', error);
        Alert.alert('Error', `Failed to write value: ${error.message}`);
      }
    },
    [connectedDevice],
  );

  // 🔡 Convert text to ASCII byte array
  const textStringToAsciiArray = str => {
    return Array.from(str).map(char => char.charCodeAt(0));
  };

  // 📝 Save binary data to .bin file
  const saveToBinFile = async (data, description = 'data') => {
    try {
      const buffer = Buffer.from(data);
      await RNFS.appendFile(binFilePath, buffer.toString('binary'), 'ascii');
      console.log(`✅ ${description} saved to ble_data.bin`);
    } catch (error) {
      console.error('❌ Error saving binary data to file:', error);
    }
  };

  // 📚 Read and view content of .bin file
  const readBinFile = async () => {
    try {
      const binContent = await RNFS.readFile(binFilePath, 'ascii');
      console.log('📚 BLE Binary Data:', binContent);
      Alert.alert(
        'Bin File Content',
        `Data Length: ${binContent.length} bytes`,
      );
    } catch (error) {
      console.error('❌ Error reading binary file:', error);
    }
  };

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
                {!isSearching && (
                  <TouchableOpacity
                    onPress={scanAndConnect}
                    style={styles.rescanButton}>
                    <Text style={styles.rescanText}>Rescan</Text>
                  </TouchableOpacity>
                )}
              </View>

              <DeviceList
                devices={devices}
                onConnect={connectToDevice}
                onViewDetails={device =>
                  Alert.alert('Device Details', JSON.stringify(device, null, 2))
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

              <TouchableOpacity
                onPress={readBinFile}
                style={styles.rescanButton}>
                <Text style={styles.rescanText}>View Bin File</Text>
              </TouchableOpacity>

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
