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
  ScrollView,
} from 'react-native';
import {Buffer} from 'buffer';
import DropDownPicker from 'react-native-dropdown-picker';
import QRSCANNER from './QRSCANNER';

const DeviceList1 = ({
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
  const [isLoading, setIsLoading] = useState(false);

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
      const sanitizedUrl = url.trim(); // Removes leading/trailing spaces
      setInputValues(prev => ({
        ...prev,
        '0001': sanitizedUrl ? sanitizedUrl.slice(0, 19) : '',
        '0002':
          sanitizedUrl && sanitizedUrl.length > 19
            ? sanitizedUrl.slice(19, 38)
            : '',
        '0003':
          sanitizedUrl && sanitizedUrl.length > 38
            ? sanitizedUrl.slice(38)
            : '',
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
    setIsLoading(true);
    setIsConnected(false);
    Alert.alert('Disconnected', 'The device has been disconnected.');
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
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

          {/* <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewDetails(item)}
            accessibilityLabel={`View details for ${
              item.advertising.localName || 'Unknown'
            }`}>
            <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity> */}
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
    const limitedText = text.trim().slice(0, 57);

    const chunk1 = limitedText.slice(0, 19);
    const chunk2 = limitedText.slice(19, 38);
    const chunk3 = limitedText.slice(38, 57);

    setInputValues(prev => ({
      ...prev,
      '0001': chunk1,
      '0002': chunk2,
      '0003': chunk3,
      url: limitedText, // Optional: helpful for display
    }));

    if (text.length > 57) {
      Alert.alert('Error', 'Combined URL exceeds maximum length of 57 bytes.');
    }
  };

  const sendData = async () => {
    setIsLoading(true);
  
    if (!connectedDevice) {
      console.warn('No connected device. Cannot send data.');
      setIsLoading(false);
      return;
    }
  
    const defaultValues = {
      url: '',
      '0004': '',
      '0005': '',
      '0006': '',
      '0007': '4',
      '0008': '',
      '0009': '',
      '0010': '',
      '0011': '',
      '0012': '',
      '0013': '',
      '0014': '',
      '0015': '',
    };
  
    const urlToUse = isConnected ? inputValues.url || '' : defaultValues.url;
    const valuesToSend = {};
  
    // --- Split URL into chunks (0001–0003)
    if (urlToUse.length > 0) valuesToSend['0001'] = urlToUse.slice(0, 19);
    if (urlToUse.length > 19) valuesToSend['0002'] = urlToUse.slice(19, 38);
    if (urlToUse.length > 38) valuesToSend['0003'] = urlToUse.slice(38, 57);
  
    // --- Handle APN (0004–0005)
    const apnInput = inputValues['0004'] || '' + (inputValues['0005'] || '');
    if (apnInput.length > 0) {
      valuesToSend['0004'] = apnInput.slice(0, 19);
      if (apnInput.length > 19) valuesToSend['0005'] = apnInput.slice(19, 38);
    }
  
    // --- Handle remaining fields (0006–0009)
    ['0006', '0007', '0008', '0009'].forEach(key => {
      valuesToSend[key] =
        isConnected && inputValues[key]
          ? inputValues[key]
          : defaultValues[key];
    });
  
    // --- Handle phone numbers (0010–0015)
    for (let i = 10; i <= 15; i++) {
      const key = `00${i}`;
      valuesToSend[key] =
        isConnected && inputValues[key] ? inputValues[key] : defaultValues[key];
    }
  
    const combinedURL =
      (valuesToSend['0001'] || '') +
      (valuesToSend['0002'] || '') +
      (valuesToSend['0003'] || '');
    console.log('✅ Final Combined URL:', combinedURL);
  
    try {
      for (const [characteristicKey, value] of Object.entries(valuesToSend)) {
        const bufferValue = Buffer.from(value ?? '', 'utf-8');
        const characteristic = characteristics.find(
          c => c.characteristic === characteristicKey,
        );
        const service = services.find(s => s.uuid === characteristic?.service);
  
        if (!service || !characteristic) {
          console.warn(
            `Service or characteristic not found for key: ${characteristicKey}`,
          );
          continue;
        }
  
        console.log('📤 Writing:', {
          key: characteristicKey,
          value,
          hex: bufferValue.toString('hex'),
        });
  
        let success = false;
        let attempts = 0;
        const maxRetries = 3;
  
        while (!success && attempts < maxRetries) {
          try {
            await onWrite(
              characteristicKey,
              connectedDevice,
              service.uuid,
              bufferValue,
            );
            console.log(
              `✅ Wrote ${characteristicKey} on attempt ${attempts + 1}`,
            );
            success = true;
          } catch (err) {
            console.error(
              `❌ Failed to write ${characteristicKey} (Attempt ${
                attempts + 1
              }):`,
              err,
            );
            attempts++;
            await delay(1000);
          }
        }
  
        if (!success) {
          console.error(
            `❌ Giving up on writing ${characteristicKey} after ${maxRetries} attempts.`,
          );
        }
  
        await delay(1000);
      }
    } catch (err) {
      console.error('❌ General error during write process:', err);
    } finally {
      setIsLoading(false);
      setInputValues({});
      setModalVisible(false);
    }
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


<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.modalText}>Write Characteristic Values</Text>

            {/* TextInput for Characteristics 0001, 0002, 0003 */}
            <Text style={styles.header}>URL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter URL"
              value={inputValues.url || ''}
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
            <Text style={styles.header}>Sleep Time(Min)</Text>

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

<Text style={styles.header}>Phone Number 1</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0010'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0010': text}))
  }
  maxLength={13}
/>
<Text style={styles.header}>Phone Number 2</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0011'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0011': text}))
  }
  maxLength={13}
/>

<Text style={styles.header}>Phone Number 3</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0012'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0012': text}))
  }
  maxLength={13}
/>
<Text style={styles.header}>Phone Number 4</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0013'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0013': text}))
  }
  maxLength={13}
/>
<Text style={styles.header}>Phone Number 5</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0014'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0014': text}))
  }
  maxLength={13}
/>
<Text style={styles.header}>Phone Number 6</Text>

<TextInput
  style={styles.input}
  placeholder="Enter Phone Number with country code"
  keyboardType="phone-pad"
  value={inputValues['0015'] || ''}
  onChangeText={text =>
    setInputValues(prev => ({...prev, '0015': text}))
  }
  maxLength={13}
/>

            <TouchableOpacity
              style={styles.sendButton}
              disabled={isLoading}
              onPress={sendData}>
              <Text style={styles.buttonText}>
                {isLoading ? 'Sending Data' : 'Send Data'}
              </Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal transparent={true} animationType="fade" visible={isLoading}>
        <View style={styles.modalOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
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
    width: '80%',
    alignSelf: 'center',
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

export default DeviceList1;
