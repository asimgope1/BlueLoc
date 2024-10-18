import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  StatusBar,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';
import DropDownPicker from 'react-native-dropdown-picker';

const BluetoothScanner = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [services, setServices] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [selectedCharacteristic, setSelectedCharacteristic] = useState(null);
  const [readValue, setReadValue] = useState('');
  const [writeValue, setWriteValue] = useState('');
  const [charDropdownOpen, setCharDropdownOpen] = useState(false);

  const { width: WIDTH, height: HEIGHT } = Dimensions.get('window');

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

  const writeCharacteristic = useCallback(async () => {
    if (selectedCharacteristic && writeValue && connectedDevice) {
      try {
        let byteArray;

        byteArray = textStringToAsciiArray(writeValue.toString());
        // Handle different characteristics conversions
        if (selectedCharacteristic.characteristic === "0008") {
          // Convert port value to ASCII byte array
          byteArray = textStringToAsciiArray(writeValue.toString());
        }

        else if (selectedCharacteristic.characteristic === "0009") {
          // Convert baud rate value to ASCII byte array
          byteArray = textStringToAsciiArray(writeValue.toString());
        } else if (selectedCharacteristic.characteristic === "0007") {
          // Convert the numeric value to its ASCII byte representation
          byteArray = textStringToAsciiArray(writeValue.toString());
        }

        // Ensure byteArray is defined and is an array
        if (!byteArray || !Array.isArray(byteArray)) {
          throw new Error('Invalid byteArray, unable to proceed with writing characteristic');
        }


        const writeToCharacteristic = async (device, service, characteristic, data) => {
          await BleManager.writeWithoutResponse(device, service, characteristic, data, 512);
        };

        const characteristicMap = {
          "0001": { next: "0002", maxBytes: 19 },
          "0002": { next: "0003", maxBytes: 19 },
          "0003": { next: null, maxBytes: 19 },
          "0004": { next: "0005", maxBytes: 19 },
          "0005": { next: null, maxBytes: 19 },
          "0006": { next: null, maxBytes: 19 },
          "0007": { next: null, maxBytes: 19, defaultValue: [4] },
          "0008": { next: null, maxBytes: 19 },
          "0009": { next: null, maxBytes: 19 },
        };

        const writeDataWithOverflow = async (startingCharacteristic, data) => {
          let currentCharacteristic = startingCharacteristic;
          let offset = 0;

          while (currentCharacteristic && offset < data.length) {
            const { next, maxBytes } = characteristicMap[currentCharacteristic];
            const chunk = data.slice(offset, offset + maxBytes);

            console.log(`Writing to characteristic ${currentCharacteristic}:`, chunk);
            await writeToCharacteristic(
              connectedDevice,
              selectedCharacteristic.service,
              currentCharacteristic,
              chunk
            );

            currentCharacteristic = next;
            offset += maxBytes;
          }

          if (offset < data.length) {
            throw new Error('Data size exceeds available characteristic storage');
          }
        };

        const characteristic = selectedCharacteristic.characteristic;
        if (characteristic === "0001" || characteristic === "0002" || characteristic === "0003") {
          await writeDataWithOverflow("0001", byteArray);
        } else if (characteristic === "0004" || characteristic === "0005") {
          await writeDataWithOverflow("0004", byteArray);
        } else if (characteristic === "0006") {
          await writeDataWithOverflow("0006", byteArray);
        } else if (characteristic === "0007") {
          await writeDataWithOverflow("0007", byteArray);
        } else if (characteristic === "0008") {
          await writeDataWithOverflow("0008", byteArray);
        } else if (characteristic === "0009") {
          await writeDataWithOverflow("0009", byteArray);
        } else {
          throw new Error('Unsupported characteristic');
        }

        Alert.alert('Success', 'Value written successfully');
      } catch (error) {
        console.warn('Error writing characteristic:', error);
        Alert.alert('Error', 'Failed to write characteristic.');
      }
    } else {
      Alert.alert('Error', 'No characteristic selected or value not provided.');
    }
  }, [connectedDevice, selectedCharacteristic, writeValue]);

  // Convert a text string to an ASCII byte array
  function textStringToAsciiArray(textString) {
    return Array.from(textString).map(char => char.charCodeAt(0));
  }

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
    <>
      <StatusBar backgroundColor={'#808080'} barStyle={'light-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
          <View style={styles.container}>
            <View
              style={{
                width: WIDTH,
                height: HEIGHT * 0.05,
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'center',
                justifyContent: 'center',
                backgroundColor: '#808080',
              }}>
              <View
                style={{
                  height: '100%',
                  width: '50%',
                }}>
                <Text style={{ ...styles.header, marginLeft: '10%' }}>
                  Devices
                </Text>
              </View>
              <TouchableOpacity
                onPress={scanAndConnect}
                style={{
                  // backgroundColor: '#007bff',
                  // paddingVertical: 10,
                  borderRadius: 5,
                  height: '100%',
                  width: '50%',
                  alignItems: 'flex-end',
                }}>
                <Text style={{ ...styles.header, marginRight: '20%' }}>Scan</Text>
              </TouchableOpacity>
            </View>
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
                renderItem={({ item }) => (
                  <View style={styles.deviceContainer}>
                    <Text
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={styles.device}>
                      Device found:{item.name}
                    </Text>
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
              <TouchableOpacity
                style={styles.button}
                onPress={disconnectFromDevice}>
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
            {connectedDevice && (
              <>
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
                    renderItem={({ item }) => (
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

                    <Text style={styles.header}>Characteristic Value</Text>
                    {selectedCharacteristic?.characteristic === "0007" && <DropDownPicker
                      open={charDropdownOpen}
                      value={writeValue}
                      items={[
                        { label: '4', value: 4 },
                        { label: '8', value: 8 },
                        { label: '12', value: 12 },
                        { label: '16', value: 16 },
                      ]}
                      setOpen={setCharDropdownOpen}
                      setValue={(value) => {
                        setWriteValue(value); // Directly set the selected value
                      }}
                      style={styles.input}
                    />}

                    {selectedCharacteristic?.characteristic === "0008" && (
                      <TextInput
                        keyboardType="numeric"
                        placeholder="Enter Port Value"
                        placeholderTextColor={'grey'}
                        value={writeValue}
                        maxLength={4}

                        onChangeText={setWriteValue}
                        style={styles.input}
                      />
                    )}
                    {selectedCharacteristic?.characteristic === "0009" && (
                      <TextInput
                        keyboardType="numeric"
                        placeholder="Enter data Rate"
                        placeholderTextColor={'grey'}
                        value={writeValue}
                        maxLength={4}
                        onChangeText={(text) => {
                          // Ensure the value is numeric before updating state
                          // if (/^\d*$/.test(text)) { // Allow only numeric input
                          setWriteValue(text);
                          // }
                        }}
                        style={styles.input}
                      />
                    )}
                    {selectedCharacteristic?.characteristic !== "0008" && selectedCharacteristic?.characteristic !== "0009" && selectedCharacteristic?.characteristic !== "0007" && (
                      <TextInput
                        style={styles.input}
                        placeholderTextColor={'gray'}
                        placeholder="Enter value to write"
                        value={writeValue}
                        onChangeText={(txt) => setWriteValue(txt)}
                      />
                    )}
                    <Button
                      title="Write Characteristic"
                      onPress={() => writeCharacteristic()}
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 16,
    backgroundColor: 'gray',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
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
    fontWeight: 'bold',
    color: 'black',
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
    backgroundColor: 'white',
  },
});

export default BluetoothScanner;
