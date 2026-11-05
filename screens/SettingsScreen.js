// screens/SettingsScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

const T = {
  bg: "#061018",
  card: "#0b1520",
  card2: "#0f1a26",
  border: "#1e2a36",
  text: "#e6edf3",
  muted: "#9fb0c3",
  accent: "#4aa8ff",
};

const PREFS_KEY = "@app_prefs_v1";

// 🔑 local keys you’ve been using elsewhere in the app
const LOCAL_KEYS = [
  "@sb_quizzes_v1",        // quizzes (local fallback)
  "@sb_progress_v1",       // old progress key
  "@sb_notes_v1",          // notes (local fallback)
  "@sb_planner_v1",        // planner
  "@sb_profile",           // profile from setup screen
  "@studybuddy_user",      // legacy user cache
  PREFS_KEY,               // settings prefs
];

export default function SettingsScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [prefs, setPrefs] = useState({
    notifications: true,
    haptics: true,
    compactUI: false,
    wifiOnlySync: false,
    useSystemTheme: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const em = data?.session?.user?.email || "";
        setEmail(em);

        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
      } catch {}
    })();
  }, []);

  const setPref = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
  };

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 🧹 clear known local keys (best-effort)
  const wipeLocalData = async (userId) => {
    try {
      const perUserKeys = [
        `@sb_quizzes_${userId}`,
        `@sb_progress_${userId}`,
        `@sb_notes_${userId}`,
        `@sb_planner_${userId}`,
      ];
      await AsyncStorage.multiRemove([...LOCAL_KEYS, ...perUserKeys]);
    } catch {}
  };

  // 🔥 actually delete account via Edge Function
 const performDeleteAccount = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      Alert.alert("Error", "You must be logged in to delete your account.");
      return;
    }

    const res = await fetch("https://hsffmmratuwfwxmnryrs.supabase.co/functions/v1/delete-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || "Failed to delete account");

    Alert.alert("Account deleted", "Your account and data have been deleted successfully.");
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] }); // or "Login" if that's your start screen
  } catch (err) {
    Alert.alert("Error", err.message || "Something went wrong during deletion.");
  }
};

// 🛡️ first confirmation dialog
const handleDeletePress = () => {
  Alert.alert(
    "Delete account?",
    "This will permanently delete your account and all associated data (notes, quizzes, progress, planner). This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        style: "destructive",
        onPress: () => {
          performDeleteAccount();
        },
      },
    ]
  );
};

  const Row = ({ icon, label, right, onPress, danger }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress || deleting}
      style={[
        s.row,
        danger && { borderColor: "#3d1f25", backgroundColor: "#141016" },
        deleting && { opacity: 0.6 },
      ]}
    >
      <View style={s.rowLeft}>
        {icon}
        <Text style={[s.rowText, danger && { color: "#ff6b6b" }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>{right}</View>
    </Pressable>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} disabled={deleting}>
          <Ionicons name="chevron-back" size={20} color={T.text} />
        </Pressable>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Account */}
      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.card}>
        <Row
          icon={<Feather name="mail" size={18} color={T.muted} />}
          label={email || "Signed out"}
          right={<Text style={s.muted}>Email</Text>}
        />
        <Row
          icon={<Feather name="user" size={18} color={T.muted} />}
          label="Edit profile"
          right={<Feather name="chevron-right" size={18} color={T.muted} />}
          onPress={() => navigation.navigate("ProfileSetup")}
        />
        <Row
          icon={<Feather name="key" size={18} color={T.muted} />}
          label="Change password"
          right={<Feather name="chevron-right" size={18} color={T.muted} />}
          onPress={() =>
            Alert.alert(
              "Change password",
              "We’ll send a password reset email.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Send",
                  onPress: async () => {
                    if (!email) return;
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      // set your real redirect if you use a web reset flow
                      redirectTo: "https://example.com/reset",
                    });
                    if (error) Alert.alert("Error", error.message);
                    else Alert.alert("Sent", "Check your email to reset your password.");
                  },
                },
              ]
            )
          }
        />
      </View>

      {/* Preferences */}
      <Text style={s.sectionTitle}>Preferences</Text>
      <View style={s.card}>
        <Row
          icon={<Feather name="bell" size={18} color={T.muted} />}
          label="Notifications"
          right={
            <Switch
              value={prefs.notifications}
              onValueChange={(v) => setPref("notifications", v)}
              thumbColor={prefs.notifications ? "#95c8ff" : "#2a3a48"}
              trackColor={{ true: "#1a3a59", false: "#0f1a26" }}
            />
          }
        />
        <Row
          icon={<Feather name="smartphone" size={18} color={T.muted} />}
          label="Haptics"
          right={
            <Switch
              value={prefs.haptics}
              onValueChange={(v) => setPref("haptics", v)}
              thumbColor={prefs.haptics ? "#95c8ff" : "#2a3a48"}
              trackColor={{ true: "#1a3a59", false: "#0f1a26" }}
            />
          }
        />
        <Row
          icon={<Feather name="grid" size={18} color={T.muted} />}
          label="Compact cards"
          right={
            <Switch
              value={prefs.compactUI}
              onValueChange={(v) => setPref("compactUI", v)}
              thumbColor={prefs.compactUI ? "#95c8ff" : "#2a3a48"}
              trackColor={{ true: "#1a3a59", false: "#0f1a26" }}
            />
          }
        />
        <Row
          icon={<Feather name="moon" size={18} color={T.muted} />}
          label="Use system theme"
          right={
            <Switch
              value={prefs.useSystemTheme}
              onValueChange={(v) => setPref("useSystemTheme", v)}
              thumbColor={prefs.useSystemTheme ? "#95c8ff" : "#2a3a48"}
              trackColor={{ true: "#1a3a59", false: "#0f1a26" }}
            />
          }
        />
      </View>

      {/* About / Danger */}
      <Text style={s.sectionTitle}>About</Text>
      <View style={s.card}>
        <Row
          icon={<Feather name="info" size={18} color={T.muted} />}
          label="App version"
          right={<Text style={s.muted}>1.0.0</Text>}
        />
        <Row
          icon={<Feather name="lock" size={18} color={T.muted} />}
          label="Privacy & Terms"
          right={<Feather name="chevron-right" size={18} color={T.muted} />}
          onPress={() => Alert.alert("Privacy", "Link to privacy policy.")}
        />
      </View>

      <View style={s.card}>
        <Row
          icon={<Feather name="log-out" size={18} color="#ff6b6b" />}
          label="Log out"
          danger
          onPress={() =>
            Alert.alert("Log out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: onLogout },
            ])
          }
        />
        <Row
  icon={<Feather name="trash-2" size={18} color="#ff6b6b" />}
  label="Delete account"
  danger
  onPress={handleDeletePress}
/>

      </View>

      {deleting && (
        <View style={s.deletingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "800" }}>Deleting…</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.card2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: T.text,
    fontWeight: "900",
    fontSize: 18,
  },

  sectionTitle: {
    color: T.muted,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
  },

  row: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { color: T.text, fontWeight: "800" },
  muted: { color: T.muted },

  deletingOverlay: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#00000099",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
