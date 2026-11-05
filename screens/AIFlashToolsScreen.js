// screens/AIFlashToolsScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons"; // ⬅️ add Feather

/* ---------------- Utilities (no external libs) ---------------- */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const uniqBy = (arr, key) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const toLines = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => clean(l))
    .filter(Boolean);

const toSentences = (text) =>
  text
    .split(/(?<=[\.\!\?])\s+|\n+/g)
    .map((s) => clean(s))
    .filter((s) => s.length > 8);

/* ---------- STRICT PAIRS ---------- */
const parseStrictPairs = (text) => {
  const lines = toLines(text);
  const pairs = [];
  const sep = /\s*(::|—|–|-|:)\s*/;
  lines.forEach((line) => {
    const bullet = line.replace(/^[•\-\*\u2022]\s*/, "");
    const parts = bullet.split(sep);
    if (parts.length >= 2) {
      const term = clean(parts[0]);
      const def = clean(parts.slice(1).join(": "));
      if (term && def) pairs.push({ term, definition: def });
    }
  });
  lines.forEach((line) => {
    const m = line.match(/^(.+?)\s*\(([^()]{4,})\)$/);
    if (m) {
      const term = clean(m[1]);
      const def = clean(m[2]);
      if (term && def) pairs.push({ term, definition: def });
    }
  });
  return uniqBy(pairs, (x) => `${x.term}::${x.definition}`);
};

/* ---------- SMART FROM NOTES ---------- */
const firstNWords = (s, n) => s.split(/\s+/).slice(0, n).join(" ");
const makeTermFromSentence = (s) => {
  const words = s.split(/\s+/);
  const caps = words.filter((w) => /^[A-Z][\w-]*$/.test(w));
  const acr = words.find((w) => /^[A-Z]{2,}$/.test(w));
  if (acr) return acr;
  if (caps.length >= 2) return caps.slice(0, 3).join(" ");
  if (caps.length === 1) return firstNWords(s, 3);
  return firstNWords(s, 3);
};
const parseGlossaryBullets = (text) => {
  const lines = toLines(text);
  const out = [];
  lines.forEach((line) => {
    const bullet = line.replace(/^[•\-\*\u2022]\s*/, "");
    const m =
      bullet.match(/^([^:—–\-]{2,}?)\s*(::|—|–|-|:)\s+(.{4,})$/) ||
      bullet.match(/^(.+?)\s*\(([^()]{4,})\)$/);
    if (m) {
      const term = clean(m[1]);
      const def = clean(m[m.length - 1]);
      if (term && def) out.push({ term, definition: def });
    }
  });
  return out;
};
const parseIsSentences = (text) => {
  const sents = toSentences(text);
  const out = [];
  sents.forEach((s) => {
    const m = s.match(/^(.{2,60}?)\s+(is|are|means|refers to|defines|is defined as)\s+(.{8,})$/i);
    if (m) {
      const term = clean(m[1]).replace(/^[“"']|[”"']$/g, "");
      const def = clean(m[3]);
      if (term && def) out.push({ term, definition: def });
    }
  });
  return out;
};
const parseAcronym = (text) => {
  const lines = toLines(text);
  const out = [];
  lines.forEach((l) => {
    const m = l.match(/\b([A-Z]{2,})\b\s*\(([^()]{6,})\)/);
    if (m) {
      const term = m[1];
      const def = clean(m[2]);
      if (term && def) out.push({ term, definition: def });
    }
  });
  return out;
};
const buildFlashcardsSmart = (text, count = 12, bias = "mixed") => {
  let candidates = [];
  if (bias === "glossary") {
    candidates = [
      ...parseStrictPairs(text),
      ...parseGlossaryBullets(text),
      ...parseAcronym(text),
      ...parseIsSentences(text),
    ];
  } else if (bias === "is") {
    candidates = [
      ...parseIsSentences(text),
      ...parseStrictPairs(text),
      ...parseGlossaryBullets(text),
      ...parseAcronym(text),
    ];
  } else {
    candidates = [
      ...parseStrictPairs(text),
      ...parseIsSentences(text),
      ...parseGlossaryBullets(text),
      ...parseAcronym(text),
    ];
  }
  if (candidates.length < count) {
    const sents = toSentences(text);
    sents.forEach((s) => {
      const term = makeTermFromSentence(s);
      const def = s.length > 220 ? s.slice(0, 217) + "…" : s;
      candidates.push({ term, definition: def });
    });
  }
  const unique = uniqBy(
    candidates.map((c) => ({
      term: clean(c.term).replace(/[\.\:;,\-–—]+$/g, ""),
      definition: clean(c.definition),
    })),
    (x) => x.term.toLowerCase()
  );
  return unique.slice(0, count).map((c, i) => ({
    id: String(Date.now() + i),
    term: c.term,
    definition: c.definition,
  }));
};

/* ---------------- Screen ---------------- */
export default function AIFlashToolsScreen({ navigation }) {
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("strict");
  const [count, setCount] = useState(10);
  const [bias, setBias] = useState("mixed");
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState([]);
  const [quiz, setQuiz] = useState([]);

  const canGenerate = useMemo(() => notes.trim().length >= 10, [notes]);

  const generate = () => {
    if (!canGenerate) {
      Alert.alert("Add more notes", "Paste at least a few lines.");
      return;
    }
    if (mode === "strict") {
      const out = parseStrictPairs(notes);
      if (out.length === 0) {
        Alert.alert(
          "No pairs found",
          "Add lines like:\n• Photosynthesis :: Process plants use to convert light into energy\n• Mitochondria: Organelle that produces ATP"
        );
        return;
      }
      setCards(out.map((c, i) => ({ id: String(Date.now() + i), ...c })));
      if (!deckName.trim()) setDeckName("My Deck");
    } else {
      const out = buildFlashcardsSmart(notes, clamp(count, 3, 30), bias);
      setCards(out);
      if (!deckName.trim()) {
        const first = toSentences(notes)[0] || "My Deck";
        setDeckName(first.split(/\s+/).slice(0, 5).join(" "));
      }
    }
  };

  const onSendToFlashcards = () => {
    if (!cards.length) {
      Alert.alert("No cards", "Generate flashcards first.");
      return;
    }
    navigation.navigate("Flashcards", {
      prefill: cards.map(({ term, definition }) => ({ term, definition })),
      deckName: deckName || "Study Deck",
    });
  };

  const editCard = (id, field, val) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  const removeCard = (id) => setCards((prev) => prev.filter((c) => c.id !== id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ⬅️ Back + Title row (like FlashcardsHub) */}
      <View style={styles.headerRow}>
         <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
        
                  <Feather name="chevron-left" size={24} color="#ffffffff" />
                </Pressable>

        <Text style={styles.headerTitle}>AI-Lite Flash Tools</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>AI-Lite Flash Tools</Text>
        <Text style={styles.sub}>
          Paste notes to get flashcards. Format
          exactly like <Text style={styles.subEm}>Term : Definition</Text> , or just click on Smart <Text style={styles.subEm}>Notes</Text> to sort term and def.
        </Text>
      </View>

      {/* Mode + controls */}
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === "strict" && styles.modeActive]}
          onPress={() => setMode("strict")}
        >
          <Text style={[styles.modeText, mode === "strict" && styles.modeTextActive]}>
            Flashcard Pairs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "smart" && styles.modeActive]}
          onPress={() => setMode("smart")}
        >
          <Text style={[styles.modeText, mode === "smart" && styles.modeTextActive]}>
            Smartly from Notes
          </Text>
        </Pressable>
      </View>

      {mode === "smart" && (
        <View style={styles.controls}>
          <View style={styles.chipRow}>
            <Text style={styles.chipLabel}>Cards:</Text>
            {[6, 10, 15].map((n) => (
              <Pressable
                key={n}
                style={[styles.chip, count === n && styles.chipOn]}
                onPress={() => setCount(n)}
              >
                <Text style={[styles.chipText, count === n && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            <Text style={styles.chipLabel}>Bias:</Text>
            {["mixed", "is", "glossary"].map((b) => (
              <Pressable
                key={b}
                style={[styles.chip, bias === b && styles.chipOn]}
                onPress={() => setBias(b)}
              >
                <Text style={[styles.chipText, bias === b && styles.chipTextOn]}>{b}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.label}>Your notes (or paste pairs like “Term :: Definition”)</Text>
      <TextInput
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Paste text or glossary…"
        placeholderTextColor="#6b7686"
        style={styles.notes}
      />

      <Text style={styles.label}>Deck name </Text>
      <TextInput
        value={deckName}
        onChangeText={setDeckName}
        placeholder="e.g, Biology"
        placeholderTextColor="#6b7686"
        style={styles.input}
      />

      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.primary]} onPress={generate}>
          <Ionicons name="sparkles-outline" size={16} color="#0d1117" />
          <Text style={styles.primaryText}>Generate</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.light]}
          onPress={() => {
            setCards([]);
            setNotes("");
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#e6edf3" />
          <Text style={styles.lightText}>Clear</Text>
        </Pressable>
      </View>

      {!!cards.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview — edit before saving</Text>
          {cards.map((c, i) => (
            <View key={c.id} style={styles.cardRow}>
              <TextInput
                value={c.term}
                onChangeText={(v) => editCard(c.id, "term", v)}
                placeholder={`Term ${i + 1}`}
                placeholderTextColor="#6b7686"
                style={[styles.termBox, styles.box]}
              />
              <TextInput
                value={c.definition}
                onChangeText={(v) => editCard(c.id, "definition", v)}
                placeholder="Definition"
                placeholderTextColor="#6b7686"
                style={[styles.defBox, styles.box]}
                multiline
              />
              <Pressable style={styles.xBtn} onPress={() => removeCard(c.id)}>
                <Ionicons name="close" size={16} color="#ff6b6b" />
              </Pressable>
            </View>
          ))}

          <Pressable style={[styles.btn, styles.secondary]} onPress={onSendToFlashcards}>
            <Ionicons name="save-outline" size={16} color="#0a84ff" />
            <Text style={styles.secondaryText}>Send to Flashcards</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /* Base */
  container: { flex: 1, backgroundColor: "#061018", paddingTop: 8 },
  headerRow: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
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
    color: "#ffffffff",
  },
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "900", color: "#e6edf3" },
  sub: { color: "#9fb0c3", marginTop: 4 },
  subEm: { color: "#cfe3ff", fontWeight: "800" },

  /* Mode row */
  modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 6 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
    alignItems: "center",
    top: 13,
  },
  modeActive: { backgroundColor: "#0c1f2e", borderColor: "#2a3b4c" },
  modeText: { color: "#c8d4e1", fontWeight: "800" },
  modeTextActive: { color: "#4aa8ff" },

  /* Chips */
  controls: { paddingHorizontal: 16, paddingTop: 8, top: 30 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  chipLabel: { color: "#9fb0c3", fontWeight: "800" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
  },
  chipOn: { backgroundColor: "#0a84ff1a", borderColor: "#2b527a" },
  chipText: { color: "#c8d4e1", fontWeight: "800" },
  chipTextOn: { color: "#7fc0ff" },

  /* Inputs */
  label: {
    marginTop: 14,
    marginBottom: 6,
    color: "#9fb0c3",
    fontWeight: "700",
    paddingHorizontal: 16,
    top: 18,
    right: -7,
  },
  notes: {
    minHeight: 140,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
    color: "#e6edf3",
    textAlignVertical: "top",
    top: 22,
  },
  input: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0b1520",
    color: "#e6edf3",
    top: 20,
  },

  /* Buttons */
  row: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 12 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    top: 30,
  },
  primary: { backgroundColor: "#4aa8ff", borderColor: "#4aa8ff" },
  primaryText: { color: "#0d1117", fontWeight: "900" },
  light: { backgroundColor: "#0f1a26", borderColor: "#1e2a36" },
  lightText: { color: "#e6edf3", fontWeight: "800" },
  secondary: { backgroundColor: "#0c1f2e", borderColor: "#2a3b4c", marginTop: 12 },
  secondaryText: { color: "#7fc0ff", fontWeight: "800" },

  /* Cards preview */
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#e6edf3", marginBottom: 8, top: 30 },
  cardRow: {
    backgroundColor: "#0b1520",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e2a36",
    top: 30,
  },
  box: {
    backgroundColor: "#0f1a26",
    borderWidth: 1,
    borderColor: "#1e2a36",
    color: "#e6edf3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  termBox: { fontWeight: "800" },
  defBox: { minHeight: 46, textAlignVertical: "top" },
  xBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: "#1a222d",
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
});
