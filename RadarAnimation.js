import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

const RadarAnimation = () => {
    const scale1 = useRef(new Animated.Value(1)).current; // First radar circle
    const scale2 = useRef(new Animated.Value(1)).current; // Second radar circle
    const scale3 = useRef(new Animated.Value(1)).current; // Third radar circle

    useEffect(() => {
        const animate = (scale) => {
            scale.setValue(1);
            Animated.timing(scale, {
                toValue: 2,
                duration: 2000,
                useNativeDriver: true,
            }).start();
        };

        // Start animations for all scales in a loop
        Animated.loop(Animated.sequence([
            Animated.timing(scale1, {
                toValue: 2,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(scale1, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(scale2, {
                toValue: 2,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(scale2, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(scale3, {
                toValue: 2,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(scale3, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
        ])).start();

    }, [scale1, scale2, scale3]); // Run animation for all scales // Run animation for all scales

    return (
        <View style={styles.container}>

            <Image
                source={require('./assets/Images/bluetooth.png')}
                style={{
                    tintColor: 'white',
                    zIndex: 999,
                    width: 70,
                    height: 70,
                }}

            />

            <View
                style={{
                    position: 'absolute',
                    // top: 100, // Place the radar circle at the top center
                    // left: 100, // Place the radar circle at the top center
                    width: 100,
                    height: 100,
                    borderRadius: 100,
                    backgroundColor: 'grey', // Radar circle background color
                }}
            >
                <Animated.View style={[styles.radar, { transform: [{ scale: scale1 }] }]} />
                {/* Second radar circle */}
                <Animated.View style={[styles.radar, {
                    transform: [{ scale: scale2 }],
                    width: 120,
                    height: 120,
                    borderRadius: 120,
                    top: -10, // Slightly offset the second circle
                    left: -10, // Slightly offset the second circle
                }]} />
                {/* Third radar circle */}
                <Animated.View style={[styles.radar, {
                    transform: [{ scale: scale3 }],
                    width: 140,
                    height: 140,
                    borderRadius: 120,

                    top: -20, // Slightly offset the third circle
                    left: -20, // Slightly offset the third circle
                }]} />

            </View>


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%', // Ensure it takes the full height
        width: '100%', // Ensure it takes the full width
    },
    radar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#007AFF',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    radarBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'gray'
    },
});

export default RadarAnimation;
