// screens/NoteEditorScreen.js
import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

async function getNotesKey() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ? `@sb_notes_${user.id}` : "@sb_notes_local";
  } catch {
    return "@sb_notes_local";
  }
}

const CATEGORIES = ["School", "Work", "Home", "Other"];

export default function NoteEditorScreen({ navigation, route }) {
  const mode = route?.params?.mode ?? "create";
  const existing = route?.params?.note ?? null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [category, setCategory] = useState(existing?.category ?? "School");

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const save = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) {
      Alert.alert("Empty note", "Please add a title or some text.");
      return;
    }

    const key = await getNotesKey();
    const raw = await AsyncStorage.getItem(key);
    const prev = raw ? JSON.parse(raw) : [];

    let next;
    if (existing) {
      next = prev.map(n =>
        n.id === existing.id ? { ...n, title: t, body: b, category } : n
      );
    } else {
      const note = {
        id: Date.now().toString(),
        title: t,
        body: b,
        category,
        starred: false,
        createdAt: new Date().toISOString(),
      };
      next = [note, ...prev];
    }

    await AsyncStorage.setItem(key, JSON.stringify(next));
    navigation.goBack();
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={["#0e1a24", "#0b1520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Pressable onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#e6edf3" />
        </Pressable>
        <Text style={s.headerTitle}>{mode === "edit" ? "Edit Note" : "New Note"}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Inputs */}
      <View style={s.card}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#6b7686"
          style={s.titleInput}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start typing…"
          placeholderTextColor="#6b7686"
          style={s.bodyInput}
          multiline
        />

        <Text style={s.subLabel}>Category</Text>
        <View style={s.catRow}>
          {CATEGORIES.map(c => {
            const on = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[s.catPill, on && s.catPillOn]}
              >
                <Text style={[s.catTxt, on && s.catTxtOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={s.saveBtn} onPress={save}>
          <Text style={s.saveTxt}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },

  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#111c27",
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#0f1a26", borderWidth: 1, borderColor: "#1e2a36",
  },
  headerTitle: { flex: 1, textAlign: "center", color: "#e6edf3", fontWeight: "900", fontSize: 16 },

  card: {
    margin: 16,
    backgroundColor: "#0f1a26",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e2a36",
    padding: 14,
  },
  titleInput: {
    backgroundColor: "#0b1520",
    borderColor: "#1e2a36",
    borderWidth: 1,
    borderRadius: 12,
    color: "#e6edf3",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "800",
  },
  bodyInput: {
    marginTop: 10,
    minHeight: 180,
    backgroundColor: "#0b1520",
    borderColor: "#1e2a36",
    borderWidth: 1,
    borderRadius: 12,
    color: "#e6edf3",
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
  },

  subLabel: { color: "#9fb0c3", fontWeight: "800", marginTop: 12 },
  catRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  catPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  catPillOn: { backgroundColor: "#0a84ff22", borderColor: "#0a84ff" },
  catTxt: { color: "#e6edf3", fontWeight: "800" },
  catTxtOn: { color: "#0a84ff" },

  saveBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#0a84ff",
    alignItems: "center",
    justifyContent: "center",
  },
  saveTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
