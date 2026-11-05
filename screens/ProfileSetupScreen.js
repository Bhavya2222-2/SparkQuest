// screens/ProfileSetupScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabaseClient";

const PROFILE_KEY = "@sb_profile";

export default function ProfileSetupScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    const d = dob.trim();
    const g = goals.trim();

    if (!f) {
      Alert.alert("Missing info", "Please enter your first name.");
      return;
    }

    try {
      setLoading(true);

      // 1) Save to Supabase if the user is logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          // Upsert into `profiles` (id matches auth user.id)
          const { error: upsertErr } = await supabase
            .from("profiles")
            .upsert(
              {
                id: user.id,
                first_name: f,
                last_name: l || null,
                dob: d || null,
                goals: g || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );
          if (upsertErr) {
            // Non-fatal: we'll still cache locally
            console.warn("Supabase profile upsert error:", upsertErr);
          }
        }
      } catch (e) {
        // Non-fatal: proceed with local cache
        console.warn("Supabase getUser/upsert failed:", e);
      }

      // 2) Cache locally for fast/offline greeting
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ firstName: f, lastName: l, dob: d, goals: g })
      );

      // 3) Go to Home
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Something went wrong while saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>We’ll personalize your study plan.</Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          placeholder="Last name"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Date of Birth</Text>
        <TextInput
          placeholder="MM/DD/YYYY"
          value={dob}
          onChangeText={(text) => {
            let cleaned = text.replace(/\D/g, "");
            if (cleaned.length > 2 && cleaned.length <= 4) {
              cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
            } else if (cleaned.length > 4) {
              cleaned =
                cleaned.slice(0, 2) +
                "/" +
                cleaned.slice(2, 4) +
                "/" +
                cleaned.slice(4, 8);
            }
            setDob(cleaned);
          }}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
        />

        <Text style={styles.label}>Learning Goals</Text>
        <TextInput
          placeholder="e.g., Ace AP Bio, learn Python..."
          value={goals}
          onChangeText={setGoals}
          style={[styles.input, { height: 100 }]}
          multiline
        />

        <Pressable onPress={onSave} disabled={loading} style={{ top: 56 }}>
          <LinearGradient
            colors={["#7737b2ff", "#328aa3e0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          >
            <Text style={styles.primaryText}>
              {loading ? "Saving..." : "Save and Continue"}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101010f3" },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", top: 60 },
  subtitle: {
    marginTop: 6,
    color: "#a7b0beff",
    marginBottom: 16,
    top: 60,
  },
  label: { marginTop: 12, marginBottom: 6, fontWeight: "800", color: "#fff", top: 62 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e9f2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    top: 62,
  },
  primaryBtn: {
    padding: 14,
    borderRadius: 12,
    top: 50,
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
});
