import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BG_VIDEO } from '../backgroundConfig';

const { width: W, height: H } = Dimensions.get('window');

// Floating, slowly drifting colour blobs (works with no assets at all)
function Blob({ size, color, x, y, dx, dy, duration, delay = 0 }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: 0.55,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
        ],
      }}
    />
  );
}

function AnimatedBg() {
  return (
    <>
      <LinearGradient colors={['#DDEBF7', '#E6F4F3', '#EEF3F9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Blob size={W * 0.9} color="#7FD6D9" x={-W * 0.3} y={-H * 0.05} dx={80} dy={120} duration={7000} />
      <Blob size={W * 0.8} color="#8FB4F0" x={W * 0.4} y={H * 0.25} dx={-90} dy={80} duration={9000} delay={500} />
      <Blob size={W * 0.7} color="#B9E7D3" x={-W * 0.2} y={H * 0.6} dx={100} dy={-110} duration={8000} delay={1000} />
      <Blob size={W * 0.5} color="#F6D6E8" x={W * 0.55} y={H * 0.75} dx={-60} dy={-90} duration={10000} />
    </>
  );
}

function VideoBg({ source }) {
  const player = useVideoPlayer(source, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

// Wrap any screen: <Backdrop>...screen...</Backdrop>
export default function Backdrop({ children, style }) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#EEF3F9' }, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BG_VIDEO ? <VideoBg source={BG_VIDEO} /> : <AnimatedBg />}
        {/* soft veil keeps text readable over video/blobs */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: BG_VIDEO ? 'rgba(238,243,249,0.72)' : 'rgba(255,255,255,0.25)' }]} />
      </View>
      {children}
    </View>
  );
}
