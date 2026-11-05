import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

// helper (unchanged)
function getAuthRedirectUri() {
  const schemeUrl = Linking.createURL('/'); // uses app.json "scheme"
  return makeRedirectUri({
    scheme: schemeUrl.split('://')[0],
    native: schemeUrl,
    preferLocalhost: true,
  });
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);

  // 🔒 disable iOS back-swipe on this screen
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: false });
  }, [navigation]);

  // ✅ check profile and route accordingly (logic only; UI unchanged)
 // LoginScreen.js
const onEmailPasswordLogin = async () => {
  const e = email.trim();
  const p = pw.trim();
  if (!e || !p) {
    Alert.alert('Missing info', 'Please enter email and password.');
    return;
  }

  try {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid')) return Alert.alert('Invalid email or password');
      if (msg.includes('email not confirmed')) {
        return Alert.alert('Email not confirmed', 'Open the confirmation link we sent first.');
      }
      return Alert.alert('Login failed', error.message);
    }

    // ✅ Login success → always go to Home
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  } catch (err) {
    Alert.alert('Unexpected error', String(err?.message || err));
  } finally {
    setLoading(false);
  }
};


  const signInWithApple = async () => {
    const redirectTo = getAuthRedirectUri();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo, skipBrowserRedirect: false, scopes: 'name email' },
      });
      if (error) Alert.alert('Apple sign-in failed', error.message);
    } catch (err) {
      Alert.alert('Apple sign-in failed', String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Replace your current onForgot with this:
const onForgot = () => {
  Alert.alert('Coming soon', 'Password reset will be available soon.');
};


  const signInWithGoogle = () => {
    Alert.alert('Google sign-in', 'Wire this when you enable Google in Supabase.');
  };

  return (
    // keep your original root container
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.title}>Sign In</Text>

        {/* Email */}
        <Text style={s.label}>Email</Text>
        <View style={s.inputWrap}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="bhavya88@gmail.com"
            placeholderTextColor="#6b7686"
            style={s.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        {/* Password */}
        <Text style={[s.label, { marginTop: 14 }]}>Password</Text>
        <View style={s.inputWrap}>
          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder="••••••••"
            placeholderTextColor="#6b7686"
            style={s.input}
            secureTextEntry={!showPw}
            autoComplete="password"
            textContentType="password"
          />
          <Pressable onPress={() => setShowPw(v => !v)} style={s.eye}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8a95a6" />
          </Pressable>
        </View>

        {/* Remember + Forgot */}
        <View style={s.row}>
          <Pressable style={s.remember} onPress={() => setRemember(v => !v)}>
            <View style={[s.checkbox, remember && s.checkboxOn]}>
              {remember && <Ionicons name="checkmark" size={14} color="#a9adb4ff" />}
            </View>
            <Text style={s.remText}>Remember me</Text>
          </Pressable>
          <Pressable onPress={onForgot}>
            <Text style={[s.link, { color: '#1a8faffc' }]}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Gradient button */}
        <Pressable style={{ marginTop: 16 }} onPress={onEmailPasswordLogin} disabled={loading}>
          <LinearGradient
            colors={["#7926c6ff", "#328aa3e0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
          >
            <Text style={s.primaryText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </LinearGradient>
        </Pressable>

      


        {/* Bottom Sign Up */}
        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <Text style={s.bottomText}>
            Don’t have an account?{' '}
            <Text style={s.link} onPress={() => navigation.navigate('SignUp')}>
              Sign Up
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061018',
    paddingHorizontal: 18,
    paddingTop: Platform.select({ ios: 80, android: 40 }),
  },

  // no-op, just so <View style={s.card}> exists
  card: { position: 'relative' },

  title: { color: '#e6edf3', fontSize: 32, fontWeight: '800', marginBottom: 19, top:72 },
  label: { color: '#9fb0c3', fontSize: 13, fontWeight: '600', marginBottom: 8, top:70 },

  // 🔧 Minimal touch fix: keep your layout, just raise input rows above any overlapping pressables
  inputWrap: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2a36',
    backgroundColor: '#0f1a26',
    paddingHorizontal: 12,
    justifyContent: 'center',
    top:70,
    position: 'relative',
    zIndex: 10,         // <-- ensures taps go to TextInput, not the button under it
  },
  input: { color: '#e6edf3', fontSize: 16 },
  eye: { position: 'absolute', right: 12, height: 50, justifyContent: 'center' },

  row: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 5 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 , top:38 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#ffffffff', alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#583776ff', borderColor: '#9073aaff', top:45 },
  remText: { color: '#9fb0c3', fontSize: 13, top:45 },

  // leave as-is; it sits underneath inputs now
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', top:105 },
  primaryText: { color: '#0d1117', fontWeight: '900', fontSize: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 8 },
  dividerText: { color: '#6f8193', fontSize: 12, fontWeight: '600' , top:95 },
  line: { flex: 1, height: 1, backgroundColor: '#1a2531', top:95 },

  socialRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  socialBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e2a36',
    top:105,
  },
  socialText: { color: '#e6edf3', fontWeight: '700', top:0 },

  link: { color: '#1dd4a6', fontWeight: '800' , top:81 },
  bottomText: { color: '#8ea0b3', top:404, fontSize:16 },
});
