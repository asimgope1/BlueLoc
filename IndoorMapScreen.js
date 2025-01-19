import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Circle, Line, G, Text} from 'react-native-svg';

const IndoorMapScreen = ({route}) => {
  const {selectedDevice, currentLocation} = route.params;
  const [routePath, setRoutePath] = useState([]);

  useEffect(() => {
    console.log('path', selectedDevice, currentLocation);
    // Replace with your logic to calculate route path between currentLocation and selectedDevice
    const calculateRoutePath = () => {
      // Dummy path for demonstration
      const path = [
        {x: 50, y: 50},
        {x: 150, y: 50},
        {x: 150, y: 150},
        {x: 250, y: 150},
      ];
      setRoutePath(path);
    };

    calculateRoutePath();
  }, [currentLocation, selectedDevice]);

  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%" viewBox="0 0 300 300">
        {/* Your SVG map here */}
        {/* Example: */}
        <Circle cx="50" cy="50" r="5" fill="red" />
        <Circle cx="150" cy="50" r="5" fill="blue" />
        <Circle cx="150" cy="150" r="5" fill="green" />
        <Circle cx="250" cy="150" r="5" fill="yellow" />

        {/* Draw route path */}
        <G>
          {routePath.map(
            (point, index) =>
              index < routePath.length - 1 && (
                <Line
                  key={index}
                  x1={routePath[index].x}
                  y1={routePath[index].y}
                  x2={routePath[index + 1].x}
                  y2={routePath[index + 1].y}
                  stroke="black"
                  strokeWidth="2"
                />
              ),
          )}
        </G>

        {/* Display labels or additional elements as needed */}
        <Text x="50" y="70" fontSize="10" fill="black">
          Location A
        </Text>
        <Text x="150" y="40" fontSize="10" fill="black">
          Location B
        </Text>
        <Text x="150" y="160" fontSize="10" fill="black">
          Location C
        </Text>
        <Text x="250" y="160" fontSize="10" fill="black">
          Location D
        </Text>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});

export default IndoorMapScreen;
