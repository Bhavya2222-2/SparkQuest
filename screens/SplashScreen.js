// screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.access_token) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.access_token) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex:1, alignItems:'center', justifyContent:'center' }});
