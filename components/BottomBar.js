// components/BottomBar.js
import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BottomBar({ navigation, active = 'home' }) {
  const isActive = (k) => active === k;

  return (
    <View style={s.wrap} pointerEvents="box-none">
      {/* Bar background */}
      <View style={s.bar}>
        {/* Left buttons */}
        <Pressable
          style={s.tab}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        >
          <Ionicons
            name={isActive('home') ? 'home' : 'home-outline'}
            size={22}
            color={isActive('home') ? '#7aa2ff' : '#9fb0c3'}
          />
        </Pressable>

        <Pressable
          style={s.tab}
          onPress={() => navigation.navigate('StudyPlanner')}
        >
          <Ionicons
            name="compass-outline"
            size={22}
            color={isActive('planner') ? '#7aa2ff' : '#9fb0c3'}
          />
        </Pressable>

        {/* Spacer for the center FAB notch */}
        <View style={{ width: 64 }} />

        <Pressable
          style={s.tab}
          onPress={() => navigation.navigate('FlashcardsHub')}
        >
          <Ionicons
            name="albums-outline"
            size={22}
            color={isActive('flashcards') ? '#7aa2ff' : '#9fb0c3'}
          />
        </Pressable>

        {/* Settings at the far right */}
        <Pressable
          style={s.tab}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons
            name={isActive('settings') ? 'settings' : 'settings-outline'}
            size={22}
            color={isActive('settings') ? '#7aa2ff' : '#9fb0c3'}
          />
        </Pressable>
      </View>

      {/* Center Floating Action Button for Progress */}
      <Pressable
        accessibilityLabel="Open Progress"
        style={s.fab}
        onPress={() => navigation.navigate('Progress')}
      >
        {/* “Progress tracker” vibe */}
        <Ionicons name="stats-chart" size={24} color="#0d1117" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
  },
  bar: {
    height: 64,
    backgroundColor: '#0b1520',
    borderTopWidth: 1,
    borderTopColor: '#162332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    width: '100%',
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  tab: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    bottom: 28, // sits above the bar
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#38e1b3',
    alignItems: 'center', justifyContent: 'center',
    // nice drop shadow
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    borderWidth: 2,
    borderColor: '#e6edf3',
  },
});
