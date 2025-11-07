import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const Home = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#003366" />

      <Text style={styles.title}>Welcome to NALCO BlueLoc</Text>
      <Text style={styles.subtitle}>Choose an action to get started</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('BLEScanner')}>
        <Text style={styles.buttonText}>Write Configuration</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.otaButton]}
        onPress={() => navigation.navigate('BLEScan')}>
        <Text style={styles.buttonText}>Start OTA Update</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Light background for contrast
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#003366', // NALCO Deep Blue
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#1A1A1A', // Dark text for readability
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#005EB8', // NALCO Bright Blue
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  otaButton: {
    backgroundColor: '#FF6F00', // NALCO Orange accent for contrast
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default Home;
