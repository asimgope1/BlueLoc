import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Platform,
  PermissionsAndroid,
  NativeEventEmitter,
  NativeModules,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {Buffer} from 'buffer';

const BluetoothScanner = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [selectedCharacteristic, setSelectedCharacteristic] = useState(null);
  const [readValue, setReadValue] = useState('');
  const [writeValue, setWriteValue] = useState('');
  const [notificationBuffer, setNotificationBuffer] = useState(0);

  useEffect(() => {
    BleManager.start({showAlert: false});

    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        if (
          granted['android.permission.ACCESS_FINE_LOCATION'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_SCAN'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_CONNECT'] !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert(
            'Permission Required',
            'Please grant all permissions to use Bluetooth features.',
          );
        }
      }
    };

    requestPermissions();

    const handleDiscoverPeripheral = peripheral => {
      if (peripheral && peripheral.name) {
        setDevices(prevDevices => {
          if (!prevDevices.find(d => d.id === peripheral.id)) {
            return [...prevDevices, peripheral];
          }
          return prevDevices;
        });
      }
    };

    const handleStopScan = () => {
      console.log('Scan is stopped');
    };

    const handleDisconnectedPeripheral = data => {
      Alert.alert(
        'Disconnected',
        `Disconnected from device ${data.peripheral}`,
      );
      setConnectedDevice(null);
      setServices([]);
      setCharacteristics([]);
    };

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

  const scanAndConnect = useCallback(() => {
    console.log('Starting scan');
    setDevices([]);
    BleManager.scan([], 5, true)
      .then(() => {
        console.log('Scanning...');
      })
      .catch(error => {
        console.warn('Error during scan:', error);
      });
  }, []);

  const connectToDevice = useCallback(async deviceId => {
    try {
      await BleManager.connect(deviceId);
      console.log('Connected to device:', deviceId);
      setConnectedDevice(deviceId);
      await BleManager.retrieveServices(deviceId);
      fetchServices(deviceId);
      Alert.alert('Connected', `Successfully connected to device ${deviceId}`);
    } catch (error) {
      console.warn('Error connecting to device:', error);
      Alert.alert('Error', 'Failed to connect to device.');
    }
  }, []);

  const fetchServices = useCallback(async deviceId => {
    try {
      const servicesData = await BleManager.retrieveServices(deviceId);
      console.log('Fetched services:', servicesData.characteristics);
      const filteredCharacteristics = servicesData.characteristics.filter(
        char => char.service !== '1800' && char.service !== '1801',
      );
      setServices(servicesData.services);
      setCharacteristics(filteredCharacteristics);
    } catch (error) {
      console.warn('Error fetching services:', error);
    }
  }, []);

  const handleServiceSelect = useCallback(
    serviceUUID => {
      const serviceCharacteristics = characteristics.filter(
        char => char.service === serviceUUID,
      );
      setCharacteristics(serviceCharacteristics);
    },
    [characteristics],
  );

  const readCharacteristic = useCallback(
    async characteristic => {
      if (connectedDevice) {
        try {
          console.log(
            `Attempting to read characteristic ${characteristic.characteristic} from service ${characteristic.service}`,
          );

          // Read the characteristic
          const readData = await BleManager.read(
            connectedDevice,
            characteristic.service,
            characteristic.characteristic,
          );

          console.log('Read data:', readData);

          // Convert the read data to Buffer
          const buffer = Buffer.from(readData);

          // Optionally, process the buffer based on data type
          let parsedData;

          // Example for different types of data
          // 1. Read UInt8
          if (characteristic.dataType === 'UInt8') {
            parsedData = buffer.readUInt8(0);
          }
          // 2. Read Int16 (little-endian)
          else if (characteristic.dataType === 'Int16') {
            parsedData = buffer.readInt16LE(0);
          }
          // 3. Read Float32 (little-endian)
          else if (characteristic.dataType === 'Float32') {
            parsedData = buffer.readFloatLE(0);
          }
          // 4. Read String (assuming UTF-8 encoding)
          else if (characteristic.dataType === 'String') {
            parsedData = buffer.toString('utf8');
          }
          // 5. Handle other data types or default case
          else {
            parsedData = `${readData}`;
          }

          setReadValue(parsedData.toString());
        } catch (error) {
          console.warn('Error reading characteristic:', error);
          Alert.alert('Error', 'Failed to read characteristic.');
        }
      } else {
        Alert.alert('Error', 'No device connected.');
      }
    },
    [connectedDevice],
  );

  const startNotification = useCallback(async () => {
    if (selectedCharacteristic && connectedDevice) {
      try {
        console.log(
          `Attempting to start notification for characteristic ${selectedCharacteristic.characteristic} from service ${selectedCharacteristic.service}with buffer ${notificationBuffer}`,
        );
        await BleManager.startNotificationUseBuffer(
          connectedDevice,
          selectedCharacteristic.service,
          selectedCharacteristic.characteristic,
          // 1234,
          notificationBuffer,
        );
        console.log('Notification started');
      } catch (error) {
        console.warn('Error starting notification:', error);
        Alert.alert('Error', 'Failed to start notification.');
      }
    } else {
      Alert.alert(
        'Error',
        'No characteristic selected or device not connected.',
      );
    }
  }, [connectedDevice, selectedCharacteristic, notificationBuffer]);

  const stopNotification = useCallback(async () => {
    if (selectedCharacteristic && connectedDevice) {
      try {
        await BleManager.stopNotification(
          connectedDevice,
          selectedCharacteristic.service,
          selectedCharacteristic.characteristic,
        );
        console.log('Notification stopped');
      } catch (error) {
        console.warn('Error stopping notification:', error);
        Alert.alert('Error', 'Failed to stop notification.');
      }
    } else {
      Alert.alert(
        'Error',
        'No characteristic selected or device not connected.',
      );
    }
  }, [connectedDevice, selectedCharacteristic]);

  // Convert a hexadecimal string to an ArrayBuffer
  function hexStringToByteArray(hexString) {
    const hex = hexString.replace(/\s+/g, ''); // Remove spaces
    const length = hex.length / 2;
    const byteArray = [];

    for (let i = 0; i < length; i++) {
      byteArray.push(parseInt(hex.substr(i * 2, 2), 16));
    }

    return byteArray;
  }

  // Convert an array of integers to an ArrayBuffer
  function intArrayToByteArray(intArray) {
    // Ensure all integers are in the 0-255 range
    return intArray.map(value => value & 255);
  }

  const textStringToByteArray = textString => {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(textString);
    return Array.from(uint8Array);
  };

  // Write data to a characteristic
  const writeCharacteristic = useCallback(async () => {
    if (selectedCharacteristic && writeValue && connectedDevice) {
      try {
        let byteArray;

        // Check and convert writeValue based on its type
        if (/^[0-9A-Fa-f]+$/.test(writeValue)) {
          // Hexadecimal string
          byteArray = hexStringToByteArray(writeValue);
        } else if (
          Array.isArray(writeValue) &&
          writeValue.every(Number.isInteger)
        ) {
          // Array of integers
          byteArray = intArrayToByteArray(writeValue);
        } else if (typeof writeValue === 'string') {
          // Text string
          byteArray = textStringToByteArray(writeValue);
        } else {
          throw new Error('Invalid writeValue format');
        }

        console.log('Byte Array:', byteArray);

        // Write to BLE characteristic
        await BleManager.writeWithoutResponse(
          connectedDevice,
          selectedCharacteristic.service,
          selectedCharacteristic.characteristic,
          byteArray,
          512, // maxByteSize, optional
        );
        Alert.alert('Success', 'Value written successfully');
      } catch (error) {
        console.warn('Error writing characteristic:', error);
        Alert.alert('Error', 'Failed to write characteristic.');
      }
    } else {
      Alert.alert('Error', 'No characteristic selected or value not provided.');
    }
  }, [connectedDevice, selectedCharacteristic, writeValue]);

  const disconnectFromDevice = useCallback(async () => {
    if (connectedDevice) {
      try {
        await BleManager.disconnect(connectedDevice);
        setConnectedDevice(null);
        setServices([]);
        setCharacteristics([]);
        setWriteValue('');
        setReadValue('');
        setSelectedCharacteristic(null);
        Alert.alert(
          'Disconnected',
          `Successfully disconnected from device ${connectedDevice}`,
        );
      } catch (error) {
        console.warn('Error disconnecting from device:', error);
        Alert.alert('Error', 'Failed to disconnect from device.');
      }
    }
  }, [connectedDevice]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={styles.container}>
          <Text style={styles.header}>Bluetooth Scanner</Text>
          <Button title="Scan for Devices" onPress={scanAndConnect} />
          <View
            style={{
              height: 200,
              overflow: 'scroll',
              backgroundColor: 'white',
              borderColor: 'black',
              borderWidth: 1,
              borderRadius: 10,
            }}>
            <FlatList
              data={devices}
              renderItem={({item}) => (
                <View style={styles.deviceContainer}>
                  <Text style={styles.device}>Device found:{item.name}</Text>
                  {connectedDevice === item.id ? (
                    <TouchableOpacity
                      style={styles.button}
                      onPress={disconnectFromDevice}>
                      <Text style={styles.buttonText}>Disconnect</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => connectToDevice(item.id)}>
                      <Text style={styles.buttonText}>Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              keyExtractor={item => item.id}
            />
          </View>
          {connectedDevice && (
            <>
              {/* <Text style={styles.header}>Services</Text> */}
              {/* <FlatList
            data={services}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleServiceSelect(item.uuid)}>
                <Text style={styles.buttonText}>{`Service: ${item.uuid}`}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.uuid}
          /> */}
              <Text style={styles.header}>Characteristics</Text>
              <View
                style={{
                  height: 200,
                  overflow: 'scroll',
                  backgroundColor: 'white',
                  borderColor: 'black',
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 5,
                }}>
                <FlatList
                  data={characteristics}
                  renderItem={({item}) => (
                    <View style={styles.characteristicContainer}>
                      <Text style={styles.device}>
                        Characteristic: {item.characteristic}
                      </Text>

                      {item.properties.Read && (
                        <TouchableOpacity
                          style={styles.button}
                          onPress={() => {
                            setSelectedCharacteristic(item);
                            readCharacteristic(item);
                          }}>
                          <Text style={styles.buttonText}>Read</Text>
                        </TouchableOpacity>
                      )}

                      {item.properties.Write && (
                        <TouchableOpacity
                          style={styles.button}
                          onPress={() => {
                            setSelectedCharacteristic(item);
                            setReadValue(null);
                          }}>
                          <Text style={styles.buttonText}>Write</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  keyExtractor={item => item.characteristic}
                />
              </View>
              {selectedCharacteristic && readValue === null && (
                <>
                  {/* <View style={styles.connectedContainer}>
                <Text style={styles.connectedText}>
                  Connected to: {connectedDevice}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Notification Buffer Size"
                  keyboardType="numeric"
                  onChangeText={text => setNotificationBuffer(Number(text))}
                  value={notificationBuffer.toString()}
                />
                <Button
                  title="Start Notification with Buffer"
                  onPress={startNotification}
                />

                <Button title="Stop Notification" onPress={stopNotification} />
              </View> */}
                  <Text style={styles.header}>Characteristic Value</Text>

                  <TextInput
                    style={styles.input}
                    placeholderTextColor={'gray'}
                    placeholder="Enter value to write"
                    value={writeValue}
                    onChangeText={setWriteValue}
                  />
                  <Button
                    title="Write Characteristic"
                    onPress={writeCharacteristic}
                  />
                </>
              )}
              {selectedCharacteristic && readValue && (
                <View
                  style={{
                    padding: 8,
                    backgroundColor: 'black',
                  }}>
                  <Text
                    style={{
                      color: 'white',
                    }}>
                    Read Value: {readValue}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    color: 'black',
  },
  deviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },

  device: {
    fontSize: 16,
    color: 'red',
  },
  button: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
  },
  characteristicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
    color: 'black',
  },
});

export default BluetoothScanner;
