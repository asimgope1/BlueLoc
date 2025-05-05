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
import RNFS from 'react-native-fs';
import BleManager from 'react-native-ble-manager';
import {Buffer} from 'buffer';
import DeviceList from './DeviceList';
import RadarAnimation from './RadarAnimation';
import DocumentPicker, {
  DocumentPickerResponse,
  pick,
} from '@react-native-documents/picker';

const BLEScan = ({route}) => {
  const [scanning, setScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedCharacteristic, setSelectedCharacteristic] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // percentage 0–100

  const {width: WIDTH} = Dimensions.get('window');

  useEffect(() => {
    console.log('objectifyy in ota', route.params);
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
    const name =
      peripheral.name || peripheral.advertising?.localName || 'Unknown';
    if (name.includes('p2')) {
      console.log('🛰️ Matched Device:', JSON.stringify(peripheral, null, 2));
    }

    setDevices(prevDevices => {
      const deviceExists = prevDevices.some(dev => dev.id === peripheral.id);
      if (!deviceExists) {
        return [...prevDevices, peripheral];
      }
      return prevDevices;
    });
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

        console.log(`🔗 Connecting to ${deviceId} (${deviceName})...`);
        await BleManager.connect(deviceId);

        // Android bonding
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

        // Request MTU (Android)
        if (Platform.OS === 'android') {
          try {
            const mtu = await BleManager.requestMTU(deviceId, 180);
            console.log('📶 Requested MTU:', mtu);
          } catch (err) {
            console.warn('⚠️ MTU request failed:', err.message);
          }
        }

        // Retrieve services and characteristics
        const servicesData = await BleManager.retrieveServices(deviceId);

        // 🧾 Log entire data as formatted JSON
        console.log('📋 Full Services & Characteristics JSON:');
        console.log(JSON.stringify(servicesData, null, 2));

        // Also log UUIDs separately if you want a quick glance
        console.log(
          '📡 Services:',
          servicesData.services.map(s => s.uuid),
        );
        console.log('🧬 Characteristics:', servicesData.characteristics);

        setServices(servicesData.services);
        setCharacteristics(servicesData.characteristics);

        // Subscribe to HR notifications if available
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

  const loadFirmware = async (): Promise<Buffer | null> => {
    try {
      const [res]: DocumentPickerResponse[] = await pick({
        copyTo: 'documentDirectory', // Copy file to documentDirectory on iOS or Android
        type: ['application/octet-stream'], // Restrict file types to binary files
      });

      console.log('📁 Document Picker Response:', res);

      if (
        !res.name ||
        (!res.name.endsWith('.bin') && !res.name.endsWith('.hex'))
      ) {
        Alert.alert(
          'Invalid file',
          'Please select a .bin or .hex firmware file.',
        );
        return null;
      }

      let filePath = res.uri;

      if (!filePath) {
        Alert.alert('Error', 'Could not access the selected file.');
        return null;
      }

      console.log('📂 Picked file URI:', filePath);

      // On Android, content:// URIs can't be read directly by RNFS — need to copy it
      if (Platform.OS === 'android' && filePath.startsWith('content://')) {
        const destPath = `${RNFS.DocumentDirectoryPath}/${res.name}`;
        await RNFS.copyFile(filePath, destPath); // May require permission fixes
        filePath = destPath;
        console.log('📥 Copied content:// to:', filePath);
      }

      const exists = await RNFS.exists(filePath);
      if (!exists) {
        Alert.alert('Error', 'File does not exist at the resolved path.');
        return null;
      }

      const base64Data = await RNFS.readFile(filePath, 'base64');
      const buffer = Buffer.from(base64Data, 'base64');

      return buffer;
    } catch (err) {
      if (isCancel(err)) {
        console.log('❌ User cancelled document picker');
      } else {
        console.error('❌ Failed to load firmware:', err.message);
        Alert.alert('Error', 'Failed to load firmware file.');
      }
      return null;
    }
  };

  // Define UUIDs and constants
  const SERVICE_UUID = '0000fe20-cc7a-482a-984a-7f2ed5b3e58f';
  const UUID_BASE_ADDR = '0000fe22-8e22-4541-9d4c-21edae82ed19';
  const UUID_CONFIRM = '0000fe23-8e22-4541-9d4c-21edae82ed19';
  const UUID_RAW_DATA = '0000fe24-8e22-4541-9d4c-21edae82ed19';
  const CHUNK_SIZE = 240; // Adjusted for FUOTA (Raw Data characteristic)

  // Helper: Create base address command buffer (action, address, sector count)
  const buildBaseAddressPayload = (action, address, sectors) => {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(action, 0); // Action
    buffer.writeUIntBE(address >> 0, 1, 3); // Address (big-endian 24-bit)
    buffer.writeUInt8(sectors, 4); // Sector count
    return buffer;
  };

  // Helper: Wait for confirmation from the device
  const waitForConfirmation = targetDeviceId => {
    return new Promise((resolve, reject) => {
      const listener = BleManager.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        ({value, characteristic, peripheral}) => {
          if (
            peripheral.toLowerCase() === targetDeviceId.toLowerCase() &&
            characteristic.toLowerCase() === UUID_CONFIRM.toLowerCase()
          ) {
            const [status] = value;
            resolve(status);
            listener.remove();
          }
        },
      );

      // Timeout if no response in 5s
      setTimeout(() => {
        listener.remove();
        reject(new Error('Timeout waiting for confirmation indication'));
      }, 5000);
    });
  };

  // Main OTA function
  const startOTAUpdate = async () => {
    const deviceId = connectedDevice;
    const otaChar = characteristics.find(
      c =>
        c.characteristic.toLowerCase() === UUID_BASE_ADDR.toLowerCase() &&
        c.service.toLowerCase() === SERVICE_UUID.toLowerCase(),
    );

    if (!deviceId || !otaChar) {
      Alert.alert('Error', 'No OTA characteristic or device connected.');
      return;
    }

    const firmwareBuffer = await loadFirmware();
    if (!firmwareBuffer) return;

    // 👉 Step A: Calculate sectors required (round up to next full 8KB)
    const fileSize = firmwareBuffer.length;
    const sectorSize = 8192; // 8KB
    const sectorsNeeded = Math.ceil(fileSize / sectorSize) + 4;
    console.log(
      `📏 File size: ${fileSize} bytes, Sectors needed: ${sectorsNeeded}`,
    );

    // Show confirmation alert to user
    const userConfirmed = await new Promise(resolve => {
      Alert.alert(
        'Firmware Info',
        `Firmware size: ${fileSize} bytes\nSectors needed: ${sectorsNeeded}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Upload',
            onPress: () => resolve(true),
          },
        ],
        {cancelable: false},
      );
    });

    if (!userConfirmed) {
      console.log('🚫 User cancelled firmware upload.');
      return;
    }

    try {
      console.log('🚀 Starting FUOTA process...');

      const baseAddrPayload = buildBaseAddressPayload(0x02, 0x080000, 0);
      await BleManager.writeWithoutResponse(
        deviceId,
        SERVICE_UUID,
        UUID_BASE_ADDR,
        Array.from(baseAddrPayload),
      );
      console.log('✅ Sent base address config (START upload)');

      // Step 2: Enable notifications on confirmation characteristic
      await BleManager.startNotification(deviceId, SERVICE_UUID, UUID_CONFIRM);
      console.log('🔔 Enabled notifications on CONFIRM characteristic');

      // Step 3: Wait for 0x02 confirmation
      const confirmStatus = await waitForConfirmation(deviceId);
      console.log('📩 Device confirmation status:', confirmStatus);
      if (confirmStatus !== 0x02) {
        Alert.alert('Error', 'Device not ready for file transfer');
        return;
      }

      setUploading(true);
      // Step 4: Send firmware in 240-byte chunks
      let offset = 0;
      while (offset < firmwareBuffer.length) {
        const chunk = firmwareBuffer.slice(offset, offset + CHUNK_SIZE);
        const byteArray = Array.from(chunk);

        await BleManager.writeWithoutResponse(
          deviceId,
          SERVICE_UUID,
          UUID_RAW_DATA,
          byteArray,
          CHUNK_SIZE,
        );

        offset += CHUNK_SIZE;

        const progressPercent = Math.min(
          100,
          Math.floor((offset / firmwareBuffer.length) * 100),
        );
        setUploadProgress(progressPercent);
        console.log(`📦 Sent chunk: ${offset}/${firmwareBuffer.length}`);
        await new Promise(resolve => setTimeout(resolve, 50)); // Increase delay if needed
      }
      setUploading(false);

      console.log('📨 Firmware fully transferred');

      // Step 5: Send End-of-File Transfer (EOF) command (0x06)
      const eofPayload = buildBaseAddressPayload(0x06, 0x080000, 0);
      await BleManager.writeWithoutResponse(
        deviceId,
        SERVICE_UUID,
        UUID_BASE_ADDR,
        Array.from(eofPayload),
      );
      console.log('✅ Sent EOF command');

      // Step 6: Send File Upload Finish (0x07)
      const finishPayload = buildBaseAddressPayload(0x07, 0x080000, 0);
      await BleManager.writeWithoutResponse(
        deviceId,
        SERVICE_UUID,
        UUID_BASE_ADDR,
        Array.from(finishPayload),
      );
      console.log('✅ Sent File Upload Finish command');

      // Step 7: Wait for reboot confirmation
      try {
        const rebootConfirm = await waitForConfirmation(deviceId);
        if (rebootConfirm === 0x01) {
          Alert.alert('✅ Success', 'Device confirmed reboot.');
        } else {
          Alert.alert(
            'Notice',
            'Device responded, but no reboot confirmation.',
          );
        }
      } catch (e) {
        Alert.alert(
          '✅ Update Complete',
          'No final confirmation received, assuming success.',
        );
      }
    } catch (error) {
      setUploading(false);
      console.error('❌ FUOTA Error:', error);
      Alert.alert('OTA Failed', error.message);
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
                onWrite={startOTAUpdate}
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

      <Modal visible={uploading} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 12,
              width: '80%',
              alignItems: 'center',
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                color: 'black',
              }}>
              Uploading firmware...
            </Text>
            <ActivityIndicator
              size="large"
              color="#007bff"
              style={{marginBottom: 12}}
            />
            <View
              style={{
                width: '100%',
                height: 10,
                backgroundColor: '#eee',
                borderRadius: 6,
              }}>
              <View
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#007bff',
                  borderRadius: 6,
                }}
              />
            </View>
            <Text style={{marginTop: 10, color: 'black'}}>
              {uploadProgress}%
            </Text>
          </View>
        </View>
      </Modal>
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
