// App.js
import React from 'react';
import {Provider} from 'react-redux';
import {SafeAreaView, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import store from './store';
import BLEScanner from './BLEScanner';
import MapView from './MapView';
import IndoorMapScreen from './IndoorMapScreen';
import NearbyDevices from './NearbyDevices';
import BLEScan from './BLEScan';

const Stack = createStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
          <Stack.Navigator
            initialRouteName="BLEScan"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}>
            <Stack.Screen
              name="BLEScanner"
              component={BLEScanner}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="BLEScan"
              component={BLEScan}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="MapView"
              component={MapView}
              options={{title: 'Map View'}}
            />
            <Stack.Screen
              name="IndoorMapScreen"
              component={IndoorMapScreen}
              options={{title: 'Indoor Map'}}
            />
            <Stack.Screen
              name="Nearby"
              component={NearbyDevices}
              options={{title: 'Nearby Devices'}}
            />
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
