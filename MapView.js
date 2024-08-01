import React from 'react';
import {View, Text} from 'react-native';

const MapView = ({route}) => {
  const {selectedDevice, currentLocation} = route.params;

  console.log('params', selectedDevice, currentLocation);

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Map Component</Text>
      <Text>Selected Device: {selectedDevice.name}</Text>
      <Text>
        Current Location: {currentLocation.latitude},{' '}
        {currentLocation.longitude}
      </Text>
      {/* Implement map display and route here */}
    </View>
  );
};

export default MapView;
