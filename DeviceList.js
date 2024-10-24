import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Buffer } from 'buffer';

const DeviceList = ({ devices, onConnect, onViewDetails, onRead, onWrite, isConnecting, connectedDevice, services, characteristics }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [readValue, setReadValue] = useState(null);
    const [selectedCharacteristic, setLocalSelectedCharacteristic] = useState(null); // Local state for selected characteristic

    console.log('services', selectedCharacteristic)

    // Filter the list to show only connectable devices
    const connectableDevices = devices?.filter((device, index, self) =>
        device.advertising?.isConnectable && index === self.findIndex(d => d.id === device.id)
    );

    // Render each device item
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

                {/* Read and Write Buttons - Only show for connected device */}
                {connectedDevice === item.id && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.readButton}
                            onPress={async () => {
                                const serviceUUID = services[0]?.uuid; // Example: First service
                                const characteristicUUID = characteristics[0]?.uuid; // Example: First characteristic
                                const data = await onRead(serviceUUID, characteristicUUID);
                                const stringValue = Buffer.from(data).toString('utf-8');
                                setReadValue(stringValue);
                            }}
                            accessibilityLabel={`Read characteristic for ${item.advertising.localName || 'Unknown'}`}
                        >
                            <Text style={styles.buttonText}>Read</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.writeButton}
                            onPress={() => setModalVisible(true)} // Open modal for writing
                            accessibilityLabel={`Write characteristic for ${item.advertising.localName || 'Unknown'}`}
                        >
                            <Text style={styles.buttonText}>Write</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* List writable characteristics */}
                {connectedDevice === item.id && characteristics?.length > 0 && (
                    <View style={styles.characteristicsContainer}>
                        {characteristics.map((characteristic, index) => (
                            characteristic.properties?.write && (
                                <View key={index} style={styles.characteristicItem}>
                                    <Text style={styles.characteristicText}>{characteristic.uuid}</Text>
                                    <TouchableOpacity
                                        style={styles.writeButton}
                                        onPress={() => {
                                            setLocalSelectedCharacteristic(characteristic); // Set the local selected characteristic
                                            setModalVisible(true); // Open modal for writing
                                        }}
                                    >
                                        <Text style={styles.buttonText}>Write to {characteristic.uuid}</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        ))}
                    </View>
                )}
            </View>
        );
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

            {/* Read Value Modal */}
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

            {/* Write Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                    setLocalSelectedCharacteristic(null); // Clear local selection on modal close
                }}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Select Characteristic to Write</Text>

                    <FlatList
                        data={characteristics}
                        keyExtractor={(item, index) => `${item.uuid}-${index}`} // Combine keys
                        renderItem={({ item }) => {
                            // Check if the characteristic is writable (case insensitive)
                            const isWritable = item.properties?.write || item.properties?.Write || item.properties?.writeWithoutResponse || item.properties?.WriteWithoutResponse;

                            // Only display characteristics with write properties
                            if (isWritable) {
                                return (
                                    <TouchableOpacity
                                        style={styles.characteristicItem}
                                        onPress={() => {
                                            setLocalSelectedCharacteristic(item); // Use local state
                                        }}
                                    >
                                        <Text style={styles.characteristicText}>
                                            Characteristic: {item.uuid} (Service: {item.service})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }

                            return null; // Return null for non-writable characteristics
                        }}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={<Text style={styles.emptyText}>No writable characteristics available.</Text>}
                    />

                    {/* Input for the value to write */}
                    <TextInput
                        style={styles.input}
                        placeholder="Enter value to write"
                        value={inputValue}
                        onChangeText={setInputValue}
                    />

                    <TouchableOpacity
                        style={{ ...styles.writeButton, height: 50 }}
                        onPress={() => {
                            if (selectedCharacteristic) {
                                console.log('Writing to characteristic:', selectedCharacteristic);
                                const bufferValue = Buffer.from(inputValue, 'utf-8');
                                onWrite(selectedCharacteristic.characteristic, connectedDevice, selectedCharacteristic.service, bufferValue);
                                setInputValue(''); // Clear input after writing
                                setModalVisible(false); // Close modal
                            } else {
                                console.warn('Characteristic not available for writing');
                            }
                        }}
                    >
                        <Text style={styles.buttonText}>Write</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            setModalVisible(false);
                            setLocalSelectedCharacteristic(null); // Clear local selection on modal close
                        }}
                    >
                        <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

// Styles remain unchanged
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
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    modalView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalText: {
        color: '#ffffff',
        marginBottom: 15,
        fontSize: 18,
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 15,
        width: '80%',
        paddingHorizontal: 10,
        color: '#fff',
    },
    closeButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    characteristicsContainer: {
        marginTop: 15,
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
    },
});

export default DeviceList;
