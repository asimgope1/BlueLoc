import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {Buffer} from 'buffer';
import DropDownPicker from 'react-native-dropdown-picker';
import QRSCANNER from './QRSCANNER';

const DeviceList = ({
  devices,
  onConnect,
  onViewDetails,
  onRead,
  onWrite,
  isConnecting,
  connectedDevice,
  services,
  characteristics,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [readValue, setReadValue] = useState(null);
  const [charDropdownOpen, setCharDropdownOpen] = useState(false);
  const [writeValue, setWriteValue] = useState(4);
  const [isConnected, setIsConnected] = useState(true); // Track connection status
  const [QRCodeScanner, setQRCodeScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);

  const handleScan = scannedData => {
    console.log('Scanned Data:', scannedData); // Log the scanned data to check its type

    // Attempt to parse the scannedData if it's a string
    if (typeof scannedData === 'string') {
      try {
        scannedData = JSON.parse(scannedData); // Parse if it's a stringified object
        console.log('Parsed Scanned Data:', scannedData);
      } catch (e) {
        console.error('Failed to parse scanned data:', e);
        Alert.alert('Error', 'Invalid QR code data.');
        return;
      }
    }

    // Check if scannedData is an object and contains the expected keys
    if (scannedData && typeof scannedData === 'object') {
      const {
        url,
        apn,
        topic,
        sleepTime,
        port,
        dataRate,
        scannedData: deviceId, // Renaming scannedData to deviceId to avoid conflict
      } = scannedData;

      // Log the extracted values to ensure they are correct
      console.log('Extracted values:', {
        url,
        apn,
        topic,
        sleepTime,
        port,
        dataRate,
        deviceId,
      });

      // Safely update the input fields
      setInputValues(prev => ({
        ...prev,
        '0001': url ? url.slice(0, 19) : '', // URL first part
        '0002': url ? url.slice(19, 38) : '', // URL second part
        '0003': url ? url.slice(38) : '', // URL third part
        '0004': apn ? apn.slice(0, 19) : '', // APN first part
        '0005': apn ? apn.slice(19, 38) : '', // APN second part
        '0006': topic ? topic.slice(0, 19) : '', // TOPIC field
        '0007': sleepTime ? sleepTime.toString() : '', // Sleep Time field
        '0008': port ? port.slice(0, 19) : '', // PORT field
        '0009': dataRate ? dataRate.slice(0, 19) : '', // Data rate field
        scannedData: deviceId || '', // Device ID (if needed)
      }));

      // Optionally close the QR code scanner modal
      setQRCodeScanner(false);
      // setModalVisible(false);
    } else {
      console.error('Invalid QR code data:', scannedData);
      Alert.alert('Error', 'Invalid QR code data.');
    }
  };

  const connectableDevices = devices?.filter(
    (device, index, self) =>
      device.advertising?.isConnectable &&
      index === self.findIndex(d => d.id === device.id),
  );

  const handleDisconnect = () => {
    setIsConnected(false);
    Alert.alert('Disconnected', 'The device has been disconnected.');
  };

  useEffect(() => {
    if (connectedDevice) {
      setIsConnected(true);
    } else {
      handleDisconnect();
    }
  }, [connectedDevice]);

  const renderItem = ({item}) => {
    return (
      <View style={styles.deviceCard}>
        <Text style={styles.deviceText}>ID: {item.id}</Text>
        <Text style={styles.deviceText}>RSSI: {item.rssi}</Text>
        <Text style={styles.deviceText}>
          Name: {item.advertising.localName || 'Unknown'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => onConnect(item)}
            accessibilityLabel={`Connect to ${
              item.advertising.localName || 'Unknown'
            }`}>
            {isConnecting && connectedDevice === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {connectedDevice === item.id ? 'Disconnect' : 'Connect'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewDetails(item)}
            accessibilityLabel={`View details for ${
              item.advertising.localName || 'Unknown'
            }`}>
            <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity>
        </View>

        {connectedDevice === item.id && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.writeButton}
              onPress={() => setModalVisible(true)}
              accessibilityLabel={`Write characteristic for ${
                item.advertising.localName || 'Unknown'
              }`}>
              <Text style={styles.buttonText}>Write</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const handleTextInputChange = text => {
    // Remove any leading/trailing spaces and limit to 57 bytes before slicing
    const limitedText = text.trim().slice(0, 57);

    let chunk1 = limitedText.slice(0, 19);
    let chunk2 = limitedText.slice(19, 38);
    let chunk3 = limitedText.slice(38, 57);

    setInputValues(prev => ({
      ...prev,
      '0001': chunk1,
      '0002': chunk2,
      '0003': chunk3,
    }));

    if (text.length > 57) {
      Alert.alert('Error', 'Combined URL exceeds maximum length of 57 bytes.');
    }
  };

  const sendData = async () => {
    if (!connectedDevice) {
      console.warn('No connected device. Cannot send data.');
      return;
    }

    const valuesToSend = isConnected
      ? inputValues
      : {
          '0001': 'www.google.com'.slice(0, 19),
          '0002': 'www.google.com'.slice(19, 38),
          '0003': 'www.google.com'.slice(38, 57),
          '0004': 'testapn',
          '0006': 'testtopic',
          '0007': '4', // Sleep time default value
          '0008': '8001', // Port value default
          '0009': '2', // Data rate default
        };

    const combinedURL =
      (valuesToSend['0001'] || '') +
      (valuesToSend['0002'] || '') +
      (valuesToSend['0003'] || '');
    console.log('Combined URL to send:', combinedURL);

    const characteristicKeys = Object.keys(valuesToSend);

    for (const characteristicKey of characteristicKeys) {
      const value = valuesToSend[characteristicKey] || '';
      const bufferValue = Buffer.from(value, 'utf-8');

      console.log('Preparing to send data:', {
        characteristicKey,
        value,
        bufferValue: bufferValue.toString('hex'),
      });

      const characteristic = characteristics.find(
        c => c.characteristic === characteristicKey,
      );
      const service = services.find(s => s.uuid === characteristic?.service);

      if (service && characteristic) {
        try {
          await onWrite(
            characteristicKey,
            connectedDevice,
            service.uuid,
            bufferValue,
          );
          console.log(
            `Data successfully written for characteristic ${characteristicKey}`,
          );
          await delay(500);
        } catch (error) {
          console.error(
            `Failed to write data for characteristic ${characteristicKey}:`,
            error,
          );
        }
      } else {
        console.warn(
          `Service or characteristic not found for key: ${characteristicKey}`,
        );
      }
    }

    setInputValues({});
    setModalVisible(false);
  };
  console.log('setQRCodeScanner', scannedCode);
  console.log('inputValues', inputValues);
  return (
    <>
      <FlatList
        data={connectableDevices}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No connectable devices found.</Text>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={!!readValue}
        onRequestClose={() => setReadValue(null)}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Read Value: {readValue}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setReadValue(null)}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setQRCodeScanner(false);

          setModalVisible(false);
        }}>
        {QRCodeScanner == true ? (
          <View style={styles.modalView}>
            {QRCodeScanner && <QRSCANNER onScan={handleScan} />}
          </View>
        ) : (
          <View style={styles.modalView}>
            {/* button to open QR code scanner */}
            {/* <TouchableOpacity
              style={styles.qrCodeButton}
              onPress={() => {
                setQRCodeScanner(true);
                // setModalVisible(false);
              }}>
              <Text style={styles.buttonText}>Open QR Code Scanner</Text>
            </TouchableOpacity> */}
            <Text style={styles.modalText}>Write Characteristic Values</Text>

            {/* TextInput for Characteristics 0001, 0002, 0003 */}
            <Text style={styles.header}>URL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter URL"
              value={
                (inputValues['0001'] || '') +
                (inputValues['0002'] || '') +
                (inputValues['0003'] || '')
              }
              onChangeText={handleTextInputChange}
              maxLength={57}
            />

            <Text style={styles.header}>APN</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter APN"
              value={(inputValues['0004'] || '') + (inputValues['0005'] || '')}
              onChangeText={text => {
                let chunk1 = text.slice(0, 19);
                let chunk2 = text.slice(19, 38);

                setInputValues(prev => ({
                  ...prev,
                  '0004': chunk1,
                  '0005': chunk2,
                }));

                if (text.length > 38) {
                  Alert.alert(
                    'Error',
                    'Combined APN exceeds maximum length of 38 bytes.',
                  );
                }
              }}
              maxLength={38}
            />
            <Text style={styles.header}>TOPIC</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter TOPIC"
              value={inputValues['0006'] || ''}
              onChangeText={text => {
                if (text.length <= 19) {
                  setInputValues(prev => ({...prev, '0006': text}));
                } else {
                  Alert.alert(
                    'Error',
                    'TOPIC exceeds maximum length of 19 bytes.',
                  );
                }
              }}
              maxLength={19}
            />
            <Text style={styles.header}>Sleep Time</Text>

            <DropDownPicker
              open={charDropdownOpen}
              value={writeValue}
              items={[
                {label: '4', value: 4},
                {label: '8', value: 8},
                {label: '12', value: 12},
                {label: '16', value: 16},
              ]}
              setOpen={setCharDropdownOpen}
              onSelectItem={value => {
                setWriteValue(value.value);
                setInputValues(prev => ({
                  ...prev,
                  '0007': value.value.toString(),
                }));
              }}
              style={{
                zIndex: 3000,
                marginBottom: 15,
                backgroundColor: 'white',
                width: '80%',
                alignSelf: 'center',
              }}
              dropDownContainerStyle={{
                backgroundColor: 'white',
                borderColor: '#cccccc',
                borderWidth: 1,
                borderRadius: 8,
                width: '80%',
                alignSelf: 'center',
              }}
              placeholder="Select Sleep Time"
            />
            <Text style={styles.header}>PORT</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter Port"
              keyboardType="numeric"
              value={inputValues['0008'] || ''}
              onChangeText={text =>
                setInputValues(prev => ({...prev, '0008': text}))
              }
              maxLength={19}
            />
            <Text style={styles.header}>Date Rate</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter Data Rate"
              keyboardType="numeric"
              value={inputValues['0009'] || ''}
              onChangeText={text =>
                setInputValues(prev => ({...prev, '0009': text}))
              }
              maxLength={19}
            />

            <TouchableOpacity style={styles.sendButton} onPress={sendData}>
              <Text style={styles.buttonText}>Send Data</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 10,
  },
  deviceCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
    elevation: 3,
  },
  deviceText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  detailsButton: {
    backgroundColor: '#5856D6',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  readButton: {
    backgroundColor: '#28A745',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  writeButton: {
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyText: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  modalView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'center',
    // alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalText: {
    color: 'white',
    marginBottom: 15,
    fontSize: 18,
    alignSelf: 'center',
  },
  input: {
    // height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    width: '80%',
    paddingHorizontal: 10,
    color: '#fff',
    alignSelf: 'center',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  characteristicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  characteristicText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  dropdownContainer: {
    zIndex: 999,
    borderColor: '#cccccc',
    borderWidth: 1,
    width: '80%',
    alignSelf: 'center',
    justifyContent: 'center',
    color: '#000',
    marginBottom: 15,
  },
  qrCodeButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    alignSelf: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    alignSelf: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'white',
    justifyContent: 'center',
    paddingLeft: 40,
  },
});

export default DeviceList;
