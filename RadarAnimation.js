import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, Image} from 'react-native';

const RadarAnimation = () => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loopAnimation = scale => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    loopAnimation(scale1);
    loopAnimation(scale2);
    loopAnimation(scale3);
  }, [scale1, scale2, scale3]);

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/Images/bluetooth.png')}
        style={styles.bluetoothIcon}
      />

      <View style={styles.radarContainer}>
        <Animated.View
          style={[styles.radarRing, {transform: [{scale: scale1}]}]}
        />
        <Animated.View
          style={[
            styles.radarRing,
            {
              transform: [{scale: scale2}],
              opacity: 0.6,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.radarRing,
            {
              transform: [{scale: scale3}],
              opacity: 0.3,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // NALCO light background
    alignItems: 'center',
    justifyContent: 'center',
  },
  bluetoothIcon: {
    tintColor: '#FF6F00', // Deep NALCO blue
    zIndex: 999,
    width: 70,
    height: 70,
  },
  radarContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: '#FF6F00', // Bright NALCO blue
    backgroundColor: 'rgba(0, 94, 184, 0.1)', // subtle blue glow
  },
});

export default RadarAnimation;
