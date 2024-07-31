import React, {useRef} from 'react';
import {View, StyleSheet, Text, PanResponder, Animated} from 'react-native';

const TouchableRangeSlider = () => {
  const circle1Value = useRef(new Animated.Value(30)).current;
  const circle2Value = useRef(new Animated.Value(70)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        circle1Value.setOffset(circle1Value._value);
        circle1Value.setValue(0);
        circle2Value.setOffset(circle2Value._value);
        circle2Value.setValue(0);
      },
      onPanResponderMove: (event, gestureState) => {
        const {dx} = gestureState;
        const minValue = 0;
        const maxValue = 100;

        let newValue1 = circle1Value._offset + dx;
        let newValue2 = circle2Value._offset + dx;

        // Clamp values within range
        newValue1 = Math.max(minValue, Math.min(newValue1, maxValue));
        newValue2 = Math.max(minValue, Math.min(newValue2, maxValue));

        // Update animated values
        circle1Value.setValue(newValue1);
        circle2Value.setValue(newValue2);
      },
      onPanResponderRelease: () => {
        circle1Value.flattenOffset();
        circle2Value.flattenOffset();
      },
    }),
  ).current;

  const circle1Position = circle1Value.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const circle2Position = circle2Value.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Custom range:</Text>
      <View style={styles.range} {...panResponder.panHandlers}>
        <View style={styles.line} />
        <Animated.View style={[styles.circle, {left: circle1Position}]} />
        <Animated.View style={[styles.circle, {left: circle2Position}]} />
        <Text style={[styles.label, {left: '0%'}]}>0B</Text>
        <Text style={[styles.label, {right: '0%'}]}>100B</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  range: {
    width: '80%',
    height: 4,
    marginTop: 20,
    backgroundColor: 'white',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#838898',
  },
  circle: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'green',
    borderColor: 'white',
    borderWidth: 2,
    zIndex: 1,
  },
  label: {
    position: 'absolute',
    bottom: -20,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default TouchableRangeSlider;
