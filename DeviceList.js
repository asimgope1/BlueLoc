import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';

const DeviceList = ({ devices, onConnect, onViewDetails, onRead, onWrite, isConnecting, connectedDevice, services, characteristics }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [readValue, setReadValue] = useState(null);

    // Filter the list to show only connectable devices and ensure unique devices by ID
    const connectableDevices = devices
        ?.filter((device, index, self) =>
            device.advertising?.isConnectable &&
            index === self.findIndex(d => d.id === device.id)
        );

    // Render each device item
    const renderItem = ({ item }) => {
        const serviceUUID = connectedDevice === item.id ? services[0]?.uuid : null; // Example: First service
        const characteristicUUID = connectedDevice === item.id ? characteristics[0]?.uuid : null; // Example: First characteristic

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
                                if (serviceUUID && characteristicUUID) {
                                    const data = await onRead(serviceUUID, characteristicUUID);
                                    setReadValue(data);
                                }
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
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter value to write"
                        value={inputValue}
                        onChangeText={setInputValue}
                    />
                    <TouchableOpacity
                        style={{ height: 40 }}
                        onPress={() => {
                            if (connectedDevice && services[0]?.uuid && characteristics[0]?.uuid) {
                                console.log('Write button pressed');
                                onWrite(services[0].uuid, characteristics[0].uuid, inputValue); // Sample data for writing
                                setInputValue('');
                                setModalVisible(false);
                            } else {
                                console.log('Device, service, or characteristic not available');
                            }
                        }}
                    >
                        <Text style={styles.buttonText}>Write</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.buttonText}>Close</Text>
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
});

export default DeviceList;
