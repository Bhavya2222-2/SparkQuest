// screens/WelcomeScreen.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* TOP Gradient */}
      <LinearGradient
        colors={['#7926c6ff', '#328aa3e0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Wave sits at the very bottom of the gradient and OVER the panel */}
        <Svg
          pointerEvents="none"
          height={120}
          width="100%"
          viewBox="0 0 1440 320"
          style={styles.wave}
        >
          {/* Fill matches panel so the gradient hands off seamlessly */}
          <Path
            d="M0,192L60,170.7C120,149,240,107,360,96C480,85,600,107,720,133.3C840,160,960,192,1080,192C1200,192,1320,160,1380,144L1440,128L1440,320L0,320Z"
            fill="#0f1a26"
          />
          {/* Thin dark edge on top of the fill for a crisp wave line */}
          <Path
            d="M0,192L60,170.7C120,149,240,107,360,96C480,85,600,107,720,133.3C840,160,960,192,1080,192C1200,192,1320,160,1380,144L1440,128"
            stroke="#1d1d1d"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </LinearGradient>

      {/* Bottom Content — kept exactly as you styled it */}
      <View style={styles.panel}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Build flashcard decks, take quizzes, and track your progress.
        </Text>

        <View style={styles.ctaRow}>
          <Text style={styles.ctaLabel}>Continue</Text>
          <Pressable
            onPress={() => navigation.replace('Login')}
            hitSlop={10}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="arrow-forward" size={20} color="#0d1117" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061018',
  },
  hero: {
    height: '58%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',

    zIndex: 10, // gradient above panel
    ...(Platform.OS === 'android' ? { elevation: 10 } : {}),
  },
  wave: {
    position: 'absolute',
    bottom: -1, // locks wave to end of gradient
    left: 0,
    right: 0,
    top:450,
    zIndex: 11, // wave above panel
    ...(Platform.OS === 'android' ? { elevation: 11 } : {}),
  },

  // ⬇️ Your panel styles preserved
  panel: {
    flex: 1,
    backgroundColor: '#0f1a26',
    paddingHorizontal: 24,
    height: 50,
    top: 20,
    
    marginTop: -37,
    paddingTop: 28,
    borderTopWidth: 1,
    borderColor: '#1e2a36',
    zIndex: 1,
    ...(Platform.OS === 'android' ? { elevation: 1 } : {}),
  },
  title: {
    color: '#e6edf3',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.2,
    top: 20,
    marginBottom: 8,
  },
  subtitle: {
    color: '#9fb0c3',
    fontSize: 14.5,
    top: 20,
    lineHeight: 22,
  },
  ctaRow: {
    position: 'absolute',
    right: 22,
    bottom: Platform.select({ ios: 24, android: 18 }),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaLabel: {
    color: '#9fb0c3',
    fontWeight: '700',
  },
  ctaBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#29d3a4',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
