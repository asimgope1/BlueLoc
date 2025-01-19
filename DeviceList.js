import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Buffer } from 'buffer';
import DropDownPicker from 'react-native-dropdown-picker';

const DeviceList = ({ devices, onConnect, onViewDetails, onRead, onWrite, isConnecting, connectedDevice, services, characteristics }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [inputValues, setInputValues] = useState({});
    const [readValue, setReadValue] = useState(null);
    const [charDropdownOpen, setCharDropdownOpen] = useState(false);
    const [writeValue, setWriteValue] = useState(4);
    const [isConnected, setIsConnected] = useState(true); // Track connection status

    const connectableDevices = devices?.filter((device, index, self) =>
        device.advertising?.isConnectable && index === self.findIndex(d => d.id === device.id)
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

    const renderItem = ({ item }) => {
        return (
            <View style={styles.deviceCard}>
                <Text style={styles.deviceText}>ID: {item.id}</Text>
                <Text style={styles.deviceText}>RSSI: {item.rssi}</Text>
                <Text style={styles.deviceText}>Name: {item.advertising.localName || 'Unknown'}</Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.connectButton}
                        onPress={() => onConnect(item)}
                        accessibilityLabel={`Connect to ${item.advertising.localName || 'Unknown'}`}
                    >
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
                        accessibilityLabel={`View details for ${item.advertising.localName || 'Unknown'}`}
                    >
                        <Text style={styles.buttonText}>View Details</Text>
                    </TouchableOpacity>
                </View>

                {connectedDevice === item.id && (
                    <View style={styles.buttonContainer}>


                        <TouchableOpacity
                            style={styles.writeButton}
                            onPress={() => setModalVisible(true)}
                            accessibilityLabel={`Write characteristic for ${item.advertising.localName || 'Unknown'}`}
                        >
                            <Text style={styles.buttonText}>Write</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };


    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const handleTextInputChange = (text) => {
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
            console.warn("No connected device. Cannot send data.");
            return;
        }

        const valuesToSend = isConnected ? inputValues : {
            '0001': 'www.google.com'.slice(0, 19),
            '0002': 'www.google.com'.slice(19, 38),
            '0003': 'www.google.com'.slice(38, 57),
            '0004': 'testapn',
            '0006': 'testtopic',
            '0007': '4', // Sleep time default value
            '0008': '8001', // Port value default
            '0009': '2'    // Data rate default
        };

        const combinedURL = (valuesToSend['0001'] || '') + (valuesToSend['0002'] || '') + (valuesToSend['0003'] || '');
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

            const characteristic = characteristics.find(c => c.characteristic === characteristicKey);
            const service = services.find(s => s.uuid === characteristic?.service);

            if (service && characteristic) {
                try {
                    await onWrite(characteristicKey, connectedDevice, service.uuid, bufferValue);
                    console.log(`Data successfully written for characteristic ${characteristicKey}`);
                    await delay(500);
                } catch (error) {
                    console.error(`Failed to write data for characteristic ${characteristicKey}:`, error);
                }
            } else {
                console.warn(`Service or characteristic not found for key: ${characteristicKey}`);
            }
        }

        setInputValues({});
        setModalVisible(false);
    };

    return (
        <>
            <FlatList
                data={connectableDevices}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={styles.emptyText}>No connectable devices found.</Text>}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={!!readValue}
                onRequestClose={() => setReadValue(null)}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Read Value: {readValue}</Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setReadValue(null)}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Write Characteristic Values</Text>

                    {/* TextInput for Characteristics 0001, 0002, 0003 */}
                    <TextInput
                        style={styles.input}
                        placeholder="Enter URL"
                        value={(inputValues['0001'] || '') + (inputValues['0002'] || '') + (inputValues['0003'] || '')}
                        onChangeText={handleTextInputChange}
                        maxLength={57}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Enter APN"
                        value={(inputValues['0004'] || '') + (inputValues['0005'] || '')}
                        onChangeText={(text) => {
                            let chunk1 = text.slice(0, 19);
                            let chunk2 = text.slice(19, 38);

                            setInputValues(prev => ({
                                ...prev,
                                '0004': chunk1,
                                '0005': chunk2,
                            }));

                            if (text.length > 38) {
                                Alert.alert('Error', 'Combined APN exceeds maximum length of 38 bytes.');
                            }
                        }}
                        maxLength={38}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Enter TOPIC"
                        value={inputValues['0006'] || ''}
                        onChangeText={(text) => {
                            if (text.length <= 19) {
                                setInputValues(prev => ({ ...prev, '0006': text }));
                            } else {
                                Alert.alert('Error', 'TOPIC exceeds maximum length of 19 bytes.');
                            }
                        }}
                        maxLength={19}
                    />

                    <DropDownPicker
                        open={charDropdownOpen}
                        value={writeValue}
                        items={[
                            { label: '4', value: 4 },
                            { label: '8', value: 8 },
                            { label: '12', value: 12 },
                            { label: '16', value: 16 },
                        ]}
                        setOpen={setCharDropdownOpen}

                        onSelectItem={(value) => {
                            console.log('dropval', value.value)
                            setWriteValue(value.value);
                            setInputValues(prev => ({ ...prev, '0007': value.value.toString() }));

                        }}
                        style={{ zIndex: 3000, marginBottom: 15, backgroundColor: 'white', width: '80%', alignSelf: 'center' }}
                        dropDownContainerStyle={{
                            backgroundColor: 'white',
                            borderColor: '#cccccc',
                            borderWidth: 1,
                            borderRadius: 8,
                            width: '80%',
                            alignSelf: 'center'

                        }}
                        placeholder="Select Sleep Time"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Enter Port"
                        keyboardType="numeric"
                        value={inputValues['0008'] || ''}
                        onChangeText={(text) => setInputValues(prev => ({ ...prev, '0008': text }))}
                        maxLength={19}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Enter Data Rate"
                        keyboardType="numeric"
                        value={inputValues['0009'] || ''}
                        onChangeText={(text) => setInputValues(prev => ({ ...prev, '0009': text }))}
                        maxLength={19}
                    />

                    <TouchableOpacity style={styles.sendButton} onPress={sendData}>
                        <Text style={styles.buttonText}>Send Data</Text>
                    </TouchableOpacity>
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
        alignSelf: 'center'
    },
    input: {
        // height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 15,
        width: '80%',
        paddingHorizontal: 10,
        color: '#fff',
        alignSelf: 'center'
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
        marginBottom: 15

    }
});

export default DeviceList;
