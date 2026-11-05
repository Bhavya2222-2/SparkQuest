// screens/NoteDetailScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

export default function NoteDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [note, setNote] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const key = await getNotesKey();
        const raw = await AsyncStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        setNote(list.find(n => n.id === id) || null);
      } catch {}
    })();
  }, [id]);

  const onDelete = async () => {
    Alert.alert("Delete note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const key = await getNotesKey();
            const raw = await AsyncStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            const next = list.filter(n => n.id !== id);
            await AsyncStorage.setItem(key, JSON.stringify(next));
            navigation.goBack();
          } catch {}
        },
      },
    ]);
  };

  if (!note) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#e6edf3" />
          </Pressable>
          <Text style={s.headerTitle}>Note</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTxt}>Note not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#e6edf3" />
        </Pressable>
        <Text numberOfLines={1} style={s.headerTitle}>{note.title || "Untitled"}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={s.iconBtn} onPress={() => navigation.navigate("NoteEditor", { id: note.id })}>
            <Ionicons name="create-outline" size={18} color="#e6edf3" />
          </Pressable>
          <Pressable style={s.iconBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </Pressable>
        </View>
      </View>

      {/* body */}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.metaRow}>
          <Ionicons name="time-outline" size={14} color="#9fb0c3" />
          <Text style={s.metaTxt}>
            {new Date(note.updatedAt || note.createdAt).toLocaleString()}
          </Text>
        </View>

        <Text style={s.title}>{note.title || "Untitled"}</Text>
        {!!note.subtitle && <Text style={s.subtitle}>{note.subtitle}</Text>}

        <View style={s.noteCard}>
          <Text style={s.noteBody}>{note.body || "No content."}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },

  header: {
    paddingTop: 56,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#111c27",
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#0b1520", borderWidth: 1, borderColor: "#1e2a36",
  },
  headerTitle: { flex: 1, color: "#e6edf3", fontWeight: "900", fontSize: 16 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginTop: 12 },
  metaTxt: { color: "#9fb0c3", fontWeight: "700" },

  title: { color: "#e6edf3", fontWeight: "900", fontSize: 22, paddingHorizontal: 16, marginTop: 10 },
  subtitle: { color: "#9fb0c3", paddingHorizontal: 16, marginTop: 4 },

  noteCard: {
    marginTop: 12, marginHorizontal: 16,
    borderRadius: 16, borderWidth: 1, borderColor: "#1e2a36",
    backgroundColor: "#0f1a26", padding: 14,
  },
  noteBody: { color: "#c8d4e1", lineHeight: 22 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTxt: { color: "#9fb0c3" },
});
