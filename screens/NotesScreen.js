// screens/NotesScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabaseClient";

// -------- helpers (per-user storage) ----------
async function getNotesKey() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ? `@sb_notes_${user.id}` : "@sb_notes_local";
  } catch {
    return "@sb_notes_local";
  }
}

const CATEGORIES = ["All", "School", "Work", "Home", "Other"];

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");

  // load on focus
  const load = useCallback(async () => {
    try {
      const key = await getNotesKey();
      const raw = await AsyncStorage.getItem(key);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch {
      setNotes([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // save helper (used by star/delete inline)
  const persist = async (next) => {
    setNotes(next);
    try {
      const key = await getNotesKey();
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const onStar = (id) => {
    const next = notes.map((n) =>
      n.id === id ? { ...n, starred: !n.starred } : n
    );
    persist(next);
  };

  const onDelete = (id) => {
    const next = notes.filter((n) => n.id !== id);
    persist(next);
  };

  const openNew = () => navigation.navigate("NoteEditor", { mode: "create" });
  const openEdit = (note) =>
    navigation.navigate("NoteEditor", { mode: "edit", note });
  const openDetail = (note) =>
    navigation.navigate("NoteDetail", { id: note.id });

  // filter + search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (tab === "All" ? true : n.category === tab))
      .filter((n) =>
        q.length
          ? (n.title || "").toLowerCase().includes(q) ||
            (n.body || "").toLowerCase().includes(q)
          : true
      )
      // starred first, then newest
      .sort(
        (a, b) =>
          b.starred - a.starred ||
          new Date(b.createdAt) - new Date(a.createdAt)
      );
  }, [notes, query, tab]);

  // pretty time (short)
  const fmtWhen = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderNote = ({ item, index }) => {
    // “stacked rounded cards” vibe — vary radius/overlap a bit
    const overlap = index === 0 ? 0 : -16;

    // category-based gradient (with "Work" instead of Office)
    const grad = (() => {
      switch (item.category) {
        case "School":
          return ["#5a2fc6", "#0b1520"];
        case "Work":
          return ["#0e3a56", "#0b1520"];
        case "Home":
          return ["#3b2b6b", "#0b1520"];
        default:
          return ["#2c2446", "#0b1520"];
      }
    })();

    return (
      <View style={{ marginTop: overlap }}>
        {/* Whole card press opens NoteDetail */}
        <Pressable
          onPress={() => openDetail(item)}
          android_ripple={{ color: "#00000022" }}
        >
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.noteCard]}
          >
            {/* row: date + star */}
            <View style={styles.cardTopRow}>
              <Text style={styles.whenTxt}>{fmtWhen(item.createdAt)}</Text>

              {/* Star should not trigger navigation */}
              <Pressable
                onPress={(e) => {
                  // prevent bubbling on web; RN press events don't always support stopPropagation
                  e?.stopPropagation?.();
                  onStar(item.id);
                }}
                hitSlop={8}
              >
                <Ionicons
                  name={item.starred ? "star" : "star-outline"}
                  size={18}
                  color={item.starred ? "#ffd166" : "#c8d4e1"}
                />
              </Pressable>
            </View>

            {/* Title + preview (tap anywhere to open detail) */}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title || "(Untitled)"}
            </Text>
            {!!item.body && (
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}

            {/* actions row */}
            <View style={styles.cardActions}>
              <View style={styles.tagChip}>
                <Text style={styles.tagTxt}>{item.category}</Text>
              </View>

              <View style={{ flex: 1 }} />

              {/* Edit/Delete should not open detail */}
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  openEdit(item);
                }}
                style={styles.inlineBtn}
              >
                <Ionicons name="pencil" size={16} color="#e6edf3" />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onDelete(item.id);
                }}
                style={[styles.inlineBtn, { marginLeft: 6 }]}
              >
                <Ionicons name="trash" size={16} color="#ff6b6b" />
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with back (matches your hub style family) */}
      <LinearGradient
        colors={["#0e1a24", "#0b1520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="#ffffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Notes</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.headerSub}>Your daily notes that remind you</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#8aa0b3" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#6b7686"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {CATEGORIES.map((c) => {
            const on = tab === c;
            return (
              <Pressable key={c} onPress={() => setTab(c)} style={styles.tabBtn}>
                <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{c}</Text>
                {on && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderNote}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB (center) */}
      <Pressable style={styles.fab} onPress={openNew}>
        <Ionicons name="add" size={26} color="#0d1117" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },

  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderColor: "#111c27",
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: "#e6edf3",
  },
  headerSub: { color: "#9fb0c3", marginTop: 4 },

  searchBar: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0f1a26",
    borderWidth: 1,
    borderColor: "#1e2a36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, color: "#e6edf3", marginLeft: 8, fontSize: 15 },

  tabsRow: { flexDirection: "row", gap: 18, marginTop: 12, marginBottom: 8 },
  tabBtn: { alignItems: "center" },
  tabTxt: { color: "#8aa0b3", fontWeight: "800" },
  tabTxtOn: { color: "#e6edf3" },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    width: 24,
    borderRadius: 2,
    backgroundColor: "#0a84ff",
  },

  noteCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2a36",
    minHeight: 130,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    borderRadius: 26,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  whenTxt: { color: "#c8d4e1", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 8 },
  cardBody: { color: "#e6edf3", marginTop: 6, opacity: 0.9 },

  cardActions: { marginTop: 10, flexDirection: "row", alignItems: "center" },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
  },
  tagTxt: { color: "#c8d4e1", fontWeight: "800", fontSize: 12 },
  inlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
  },

  fab: {
    position: "absolute",
    bottom: 26,
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#29d3a4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: "#0b1a24",
  },
});
