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

const NALCO_COLORS = {
  primary: '#004080',
  secondary: '#0078D7',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1E1E1E',
  border: '#D0D7E2',
  success: '#28A745',
  danger: '#C62828',
};

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
  const [isConnected, setIsConnected] = useState(true);
  const [QRCodeScanner, setQRCodeScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = scannedData => {
    try {
      if (typeof scannedData === 'string') scannedData = JSON.parse(scannedData);
      const {url, apn, topic, sleepTime, port, dataRate, scannedData: deviceId} = scannedData;

      setInputValues(prev => ({
        ...prev,
        '0001': url?.slice(0, 19) || '',
        '0002': url?.slice(19, 38) || '',
        '0003': url?.slice(38) || '',
        '0004': apn?.slice(0, 19) || '',
        '0005': apn?.slice(19, 38) || '',
        '0006': topic?.slice(0, 19) || '',
        '0007': sleepTime?.toString() || '',
        '0008': port || '',
        '0009': dataRate || '',
        scannedData: deviceId || '',
      }));

      setQRCodeScanner(false);
    } catch (e) {
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
    setTimeout(() => setIsLoading(false), 2000);
  };

  useEffect(() => {
    connectedDevice ? setIsConnected(true) : handleDisconnect();
  }, [connectedDevice]);

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const handleTextInputChange = text => {
    const limited = text.trim().slice(0, 57);
    setInputValues(prev => ({
      ...prev,
      '0001': limited.slice(0, 19),
      '0002': limited.slice(19, 38),
      '0003': limited.slice(38, 57),
      url: limited,
    }));
    if (text.length > 57)
      Alert.alert('Error', 'Combined URL exceeds maximum length of 57 bytes.');
  };

  const sendData = async () => {
    setIsLoading(true);
    if (!connectedDevice) return setIsLoading(false);

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

    if (urlToUse.length > 0) valuesToSend['0001'] = urlToUse.slice(0, 19);
    if (urlToUse.length > 19) valuesToSend['0002'] = urlToUse.slice(19, 38);
    if (urlToUse.length > 38) valuesToSend['0003'] = urlToUse.slice(38, 57);

    const apnInput = (inputValues['0004'] || '') + (inputValues['0005'] || '');
    if (apnInput.length > 0) {
      valuesToSend['0004'] = apnInput.slice(0, 19);
      if (apnInput.length > 19) valuesToSend['0005'] = apnInput.slice(19, 38);
    }

    ['0006', '0007', '0008', '0009'].forEach(key => {
      valuesToSend[key] = inputValues[key] || defaultValues[key];
    });

    for (let i = 10; i <= 15; i++) {
      const key = `00${i}`;
      valuesToSend[key] = inputValues[key] || defaultValues[key];
    }

    try {
      for (const [key, value] of Object.entries(valuesToSend)) {
        const buffer = Buffer.from(value ?? '', 'utf-8');
        const characteristic = characteristics.find(c => c.characteristic === key);
        const service = services.find(s => s.uuid === characteristic?.service);
        if (!service || !characteristic) continue;

        let success = false;
        let attempts = 0;
        while (!success && attempts < 3) {
          try {
            await onWrite(key, connectedDevice, service.uuid, buffer);
            success = true;
          } catch {
            attempts++;
            await delay(1000);
          }
        }
        await delay(500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setInputValues({});
      setModalVisible(false);
    }
  };

  const renderItem = ({item}) => (
    <View style={styles.deviceCard}>
      <Text style={styles.deviceTitle}>{item.advertising.localName || 'Unknown'}</Text>
      <Text style={styles.deviceText}>ID: {item.id}</Text>
      <Text style={styles.deviceText}>RSSI: {item.rssi}</Text>

      <TouchableOpacity
        style={[
          styles.connectButton,
          {backgroundColor: connectedDevice === item.id ? NALCO_COLORS.danger : NALCO_COLORS.primary},
        ]}
        onPress={() => onConnect(item)}>
        {isConnecting && connectedDevice === item.id ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {connectedDevice === item.id ? 'Disconnect' : 'Connect'}
          </Text>
        )}
      </TouchableOpacity>

      {connectedDevice === item.id && (
        <TouchableOpacity
          style={[styles.writeButton, {backgroundColor: NALCO_COLORS.secondary}]}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.buttonText}>Write</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <FlatList
        data={connectableDevices}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No connectable devices found.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide">
        {QRCodeScanner ? (
          <QRSCANNER onScan={handleScan} />
        ) : (
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalHeader}>NALCO Device Configuration</Text>

              <Text style={styles.label}>URL</Text>
              <TextInput style={styles.input} value={inputValues.url || ''} onChangeText={handleTextInputChange} placeholder="Enter URL" />

              <Text style={styles.label}>APN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter APN"
                value={(inputValues['0004'] || '') + (inputValues['0005'] || '')}
                onChangeText={text => {
                  setInputValues(prev => ({
                    ...prev,
                    '0004': text.slice(0, 19),
                    '0005': text.slice(19, 38),
                  }));
                }}
              />

              <Text style={styles.label}>TOPIC</Text>
              <TextInput style={styles.input} value={inputValues['0006'] || ''} onChangeText={t => setInputValues(p => ({...p, '0006': t}))} />

              <Text style={styles.label}>Sleep Time (Min)</Text>
              <DropDownPicker
                open={charDropdownOpen}
                value={writeValue}
                items={[{label: '4', value: 4}, {label: '8', value: 8}, {label: '12', value: 12}, {label: '16', value: 16}]}
                setOpen={setCharDropdownOpen}
                onSelectItem={v => {
                  setWriteValue(v.value);
                  setInputValues(p => ({...p, '0007': v.value.toString()}));
                }}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList}
              />

              <Text style={styles.label}>PORT</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={inputValues['0008'] || ''} onChangeText={t => setInputValues(p => ({...p, '0008': t}))} />

              <Text style={styles.label}>Data Rate</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={inputValues['0009'] || ''} onChangeText={t => setInputValues(p => ({...p, '0009': t}))} />

              {[10, 11, 12, 13, 14, 15].map(i => (
                <View key={i}>
                  <Text style={styles.label}>Phone Number {i - 9}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={inputValues[`00${i}`] || ''}
                    onChangeText={t => setInputValues(p => ({...p, [`00${i}`]: t}))}
                    placeholder="Enter phone number"
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.primaryButton} onPress={sendData} disabled={isLoading}>
                <Text style={styles.primaryButtonText}>{isLoading ? 'Sending...' : 'Send Data'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={NALCO_COLORS.primary} />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  listContainer: {padding: 10, backgroundColor: NALCO_COLORS.background},
  deviceCard: {
    backgroundColor: NALCO_COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceTitle: {fontSize: 18, fontWeight: '600', color: NALCO_COLORS.primary},
  deviceText: {color: NALCO_COLORS.text, marginTop: 4},
  connectButton: {marginTop: 10, padding: 10, borderRadius: 6, alignItems: 'center'},
  writeButton: {marginTop: 10, padding: 10, borderRadius: 6, alignItems: 'center'},
  buttonText: {color: '#fff', fontWeight: 'bold'},
  emptyText: {textAlign: 'center', color: NALCO_COLORS.text, marginTop: 20, fontSize: 16},
  modalContainer: {flex: 1, backgroundColor: NALCO_COLORS.background, padding: 20},
  modalHeader: {fontSize: 20, fontWeight: '700', color: NALCO_COLORS.primary, marginBottom: 20, textAlign: 'center'},
  label: {color: NALCO_COLORS.primary, fontWeight: '500', marginBottom: 5, marginTop: 10},
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: NALCO_COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: NALCO_COLORS.text,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: NALCO_COLORS.border,
    marginBottom: 10,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: NALCO_COLORS.border,
  },
  primaryButton: {
    backgroundColor: NALCO_COLORS.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
  },
  primaryButtonText: {color: '#fff', fontWeight: 'bold'},
  cancelButton: {marginTop: 10, alignItems: 'center'},
  cancelText: {color: NALCO_COLORS.danger, fontWeight: 'bold'},
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});

export default DeviceList1;
