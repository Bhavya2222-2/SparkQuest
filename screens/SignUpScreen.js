// screens/SignUpScreen.js
import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabaseClient";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";

function getAuthRedirectUri() {
  const schemeUrl = Linking.createURL("/");
  return makeRedirectUri({
    scheme: schemeUrl.split("://")[0],
    native: schemeUrl,
    preferLocalhost: true,
    path: "auth/callback",
  });
}

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 Disable swipe-back gesture
  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const onSignUp = async () => {
    const e = email.trim(),
      p = pw.trim(),
      p2 = pw2.trim();
    if (!e || !p || !p2) return Alert.alert("Missing info", "Please fill in all fields.");
    if (p !== p2) return Alert.alert("Passwords do not match", "Please re-enter your password.");

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: { emailRedirectTo: getAuthRedirectUri() },
      });
      if (error) return Alert.alert("Sign up failed", error.message);
      navigation.reset({ index: 0, routes: [{ name: "ProfileSetup" }] });
    } catch (err) {
      Alert.alert("Unexpected error", String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Create account</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Form */}
      <View style={s.content}>
        <Text style={s.label}>Email</Text>
        <View style={s.inputRow}>
          <Ionicons name="mail-outline" size={18} color="#8aa0b3" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="bhavya@email.com"
            placeholderTextColor="#6b7686"
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        <Text style={[s.label, { marginTop: 14 }]}>Password</Text>
        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#8aa0b3" />
          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder="Password"
            placeholderTextColor="#6b7686"
            style={s.input}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
        </View>

        <Text style={[s.label, { marginTop: 14 }]}>Confirm password</Text>
        <View style={s.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#8aa0b3" />
          <TextInput
            value={pw2}
            onChangeText={setPw2}
            placeholder="Confirm password"
            placeholderTextColor="#6b7686"
            style={s.input}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
        </View>

        {/* Primary Button */}
        <Pressable style={{ marginTop: 22 }} onPress={onSignUp} disabled={loading}>
          <LinearGradient
            colors={["#7926c6ff", "#328aa3e0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.primaryBtn, loading && { opacity: 0.7 }]}
          >
            <Text style={s.primaryText}>{loading ? "Creating…" : "Sign up"}</Text>
          </LinearGradient>
        </Pressable>

        {/* Secondary Button */}
        <Pressable
          style={[s.secondaryBtn, loading && { opacity: 0.7 }]}
          onPress={() => navigation.replace("Login")}
          disabled={loading}
        >
          <Text style={s.secondaryText}>Back to Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061018",
    paddingTop: Platform.select({ ios: 56, android: 36 }),
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    top: -172,
    right: -14,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#e6edf3",
    fontWeight: "900",
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 20,
    top: -152,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginTop: 10,
  },
  label: { color: "#9fb0c3", fontWeight: "800" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1520",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
    paddingHorizontal: 12,
    height: 48,
    marginTop: 15,
  },
  input: { flex: 1, color: "#e6edf3", fontSize: 16 },
  primaryBtn: {
    height: 50,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#0d1117", fontWeight: "900", fontSize: 16 },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "#0b1520",
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  secondaryText: { color: "#e6edf3", fontWeight: "800" },
});
