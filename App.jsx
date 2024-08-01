import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import BLEScanner from './BLEScanner';
import MapView from './MapView';
import IndoorMapScreen from './IndoorMapScreen';
import NearbyDevices from './NearbyDevices';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <Stack.Navigator initialRouteName="BLEScanner">
          <Stack.Screen
            name="BLEScanner"
            component={BLEScanner}
            options={{headerShown: false}}
          />
          <Stack.Screen name="MapView" component={MapView} />
          <Stack.Screen name="IndoorMapScreen" component={IndoorMapScreen} />
          <Stack.Screen name="NearBy" component={NearbyDevices} />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
