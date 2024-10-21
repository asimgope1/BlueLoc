import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

const DeviceList = ({ devices, onConnect, onViewDetails, isConnecting, connectedDevice }) => {
    // Filter the list to show only connectable devices and ensure unique devices by ID
    const connectableDevices = devices
        ?.filter((device, index, self) =>
            device.advertising?.isConnectable &&
            index === self.findIndex(d => d.id === device.id)
        );

    // Render each device item
    const renderItem = ({ item }) => (
        <View style={styles.deviceCard}>
            <Text style={styles.deviceText}>ID: {item.id}</Text>
            <Text style={styles.deviceText}>RSSI: {item.rssi}</Text>
            <Text style={styles.deviceText}>Name: {item.advertising.localName || 'Unknown'}</Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.connectButton}
                    onPress={() => onConnect(item)} // Pass the entire device object
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
        </View>
    );

    return (
        <FlatList
            data={connectableDevices}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text
                style={{
                    textAlign: 'center',
                    fontSize: 20,
                    color: 'black'
                }}
            >No connectable devices found.</Text>}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 10,
    },
    deviceCard: {
        padding: 10,
        margin: 10,
        backgroundColor: '#ffffff',
        borderRadius: 5,
        elevation: 1,
    },
    deviceText: {
        fontSize: 16,
        marginVertical: 2,
        color: 'black'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    connectButton: {
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 5,
        flex: 1,
        marginRight: 5,
    },
    detailsButton: {
        padding: 10,
        backgroundColor: '#4CAF50',
        borderRadius: 5,
        flex: 1,
    },
    buttonText: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default DeviceList;
