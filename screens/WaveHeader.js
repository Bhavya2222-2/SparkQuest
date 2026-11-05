// screens/WaveHeader.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

export default function WaveHeader({ height = 260 }) {
  return (
    <View style={[styles.wrap, { height }]}>
      <LinearGradient
        colors={["#0a84ff", "#1663ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* subtle bubbles / blobs */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Circle cx="20" cy="22" r="6" fill="#ffffff10" />
        <Circle cx="35" cy="10" r="3.5" fill="#ffffff12" />
        <Circle cx="55" cy="18" r="5" fill="#ffffff14" />
        <Circle cx="80" cy="12" r="4" fill="#ffffff10" />
        <Path
          d="M0,65 C18,80 40,85 60,72 C75,62 90,66 100,73 L100,100 L0,100 Z"
          fill="#fff"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
});
