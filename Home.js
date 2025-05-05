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
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />

      <Text style={styles.title}>Welcome to the BlueLoc</Text>
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
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1E90FF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1E90FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 3,
  },
  otaButton: {
    backgroundColor: '#28A745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Home;
