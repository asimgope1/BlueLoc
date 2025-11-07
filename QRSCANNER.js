import {
  Alert,
  Linking,
  PermissionsAndroid,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, {useState, useEffect} from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {TextInput} from 'react-native';

const QRSCANNER = ({onScan}) => {
  // Accept onScan callback as a prop
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const [latestScannedData, setLatestScannedData] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true); // Manage camera active state

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
        await cameraGranted();
      }
    })();
  }, [hasPermission]);

  const cameraGranted = async () =>
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera Permission Required',
      message: 'App needs access to your Camera so you can take pictures.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });

  // Check if permission is granted
  if (cameraGranted === PermissionsAndroid.RESULTS.GRANTED) {
    console.log('Camera permission granted');
  } else {
    Alert.alert(
      'Camera Permission Denied',
      'Camera permission is required to take photos. Would you like to open the app settings to enable it?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            // Linking.openSettings();
          },
        },
      ],
    );
    console.log('Camera permission denied');
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'], // Specify the types of codes to scan
    onCodeScanned: codes => {
      if (codes.length > 0) {
        const scannedData = codes[0].value; // Get the first scanned code
        setLatestScannedData(scannedData); // Update the local state
        console.log(scannedData);
        setIsCameraActive(false); // Stop the camera after scanning
        onScan(scannedData); // Call the callback with the scanned data
      }
    },
  });

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDeviceText}>No Camera Device Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        codeScanner={codeScanner}
        device={device}
        isActive={isCameraActive} // Stop the camera once a code is scanned
      />
      {latestScannedData && (
        <View style={styles.resultContainer}>
          <TextInput
            placeholder="Scanned Code"
            value={latestScannedData} // Set the value of TextInput to the scanned data
            style={styles.input}
            editable={false} // Make it non-editable
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4', // Light background for the overall screen
  },
  noDeviceText: {
    fontSize: 18,
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultContainer: {
    position: 'absolute',
    bottom: 80, // Space it a little higher than the bottom
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent black background
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%', // Adjust width for better appearance
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    color: '#000',
    paddingLeft: 15,
    fontSize: 16,
    borderRadius: 10,
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default QRSCANNER;
