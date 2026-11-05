// screens/QuizzesScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons"; // ⬅️ add Feather
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabaseClient";

const STORAGE_BASE = "@sb_quizzes";

const newChoice = () => ({ id: Date.now() + Math.random(), text: "" });
const newQuestion = () => ({
  id: Date.now() + Math.random(),
  prompt: "",
  choices: [newChoice(), newChoice(), newChoice(), newChoice()],
  answerIndex: 0,
  explanation: "",
});

export default function QuizzesScreen({ navigation }) {
  const [storageKey, setStorageKey] = useState(`${STORAGE_BASE}_local`);
  const [quizzes, setQuizzes] = useState([]); // [{id,title,createdAt,questions:[], timerSeconds}]
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([newQuestion()]);
  const [editingIndex, setEditingIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(60); // ⏱ default 60

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const uid = user?.id ? user.id : "local";
        if (mounted) setStorageKey(`${STORAGE_BASE}_${uid}`);
      } catch {
        if (mounted) setStorageKey(`${STORAGE_BASE}_local`);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        setQuizzes(raw ? JSON.parse(raw) : []);
      } catch {
        setQuizzes([]);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(quizzes)).catch(() => {});
  }, [quizzes, storageKey]);

  const current = useMemo(
    () => questions[editingIndex],
    [questions, editingIndex]
  );

  const updateQuestion = (field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === editingIndex ? { ...q, [field]: value } : q))
    );
  };

  const updateChoice = (idx, text) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== editingIndex
          ? q
          : {
              ...q,
              choices: q.choices.map((c, j) => (j === idx ? { ...c, text } : c)),
            }
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion()]);
    setEditingIndex(questions.length);
  };

  const deleteQuestion = () => {
    if (questions.length === 1) {
      Alert.alert("At least one", "Keep at least one question.");
      return;
    }
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== editingIndex);
      setEditingIndex(Math.max(0, editingIndex - 1));
      return next;
    });
  };

  const validateQuiz = () => {
    const t = title.trim();
    if (!t) return "Add a quiz title.";
    if (questions.length === 0) return "Add at least one question.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1} is missing a prompt.`;
      const texts = q.choices.map((c) => c.text.trim());
      if (texts.some((x) => !x)) return `Fill all four choices on Q${i + 1}.`;
      if (q.answerIndex < 0 || q.answerIndex > 3)
        return `Pick a correct choice on Q${i + 1}.`;
    }
    if (![30, 60, 90].includes(timerSeconds))
      return "Pick a timer: 30, 60, or 90 seconds.";
    return null;
  };

  const saveQuiz = () => {
    const err = validateQuiz();
    if (err) {
      Alert.alert("Fix before saving", err);
      return;
    }
    const quiz = {
      id: Date.now().toString(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      timerSeconds,
      questions: questions.map((q) => ({
        prompt: q.prompt.trim(),
        choices: q.choices.map((c) => c.text.trim()),
        answerIndex: q.answerIndex,
        explanation: q.explanation?.trim() || "",
      })),
    };
    setQuizzes((prev) => [quiz, ...prev]);
    Alert.alert("Saved!", "Your quiz is now in the list below.");
    setTitle("");
    setQuestions([newQuestion()]);
    setEditingIndex(0);
    setTimerSeconds(60);
  };

  const removeQuiz = (id) =>
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  const startQuiz = (quiz) => navigation.navigate("TakeQuiz", { quiz });

  const TimerPill = ({ val }) => (
    <Pressable
      onPress={() => setTimerSeconds(val)}
      style={[styles.timerPill, timerSeconds === val && styles.timerPillOn]}
    >
      <Text
        style={[
          styles.timerPillTxt,
          timerSeconds === val && styles.timerPillTxtOn,
        ]}
      >
        {val}s
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#061018" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header with back button matching FlashcardsHub style */}
      <LinearGradient
        colors={["#0e1a24", "#0b1520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrap}
      >
        <View style={styles.headerRow}>
         <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
                     <Feather name="chevron-left" size={24} color="#ffffffff" />
                   </Pressable>
          <Text style={styles.headerTitle}>Quizzes</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={styles.headerSub}>Build, save, and practice MCQ sets.</Text>
      </LinearGradient>

      <FlatList
        style={styles.container}
        ListHeaderComponent={
          <>
            {/* Builder */}
            <View style={styles.builderCard}>
              {/* Title row */}
              <Text style={styles.label}>Quiz Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., AP Bio"
                placeholderTextColor="#6b7686"
                style={styles.input}
              />

              {/* Timer picker */}
              <Text style={[styles.label, { marginTop: 10 }]}>
                Timer (per question)
              </Text>
              <View style={styles.timerRow}>
                <TimerPill val={30} />
                <TimerPill val={60} />
                <TimerPill val={90} />
              </View>

              {/* Q switcher */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ paddingRight: 6 }}
              >
                <View style={styles.pillRow}>
                  {questions.map((_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setEditingIndex(i)}
                      style={[styles.pill, i === editingIndex && styles.pillOn]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          i === editingIndex && styles.pillTextOn,
                        ]}
                      >
                        Q{i + 1}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={[styles.pill, styles.pillAdd]}
                    onPress={addQuestion}
                  >
                    <Ionicons name="add" size={16} color="#0a84ff" />
                    <Text style={[styles.pillText, styles.pillAddText]}>
                      Add
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Current question */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Question {editingIndex + 1}
                </Text>
                <Pressable style={styles.deleteGhost} onPress={deleteQuestion}>
                  <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  <Text style={styles.deleteGhostText}>Remove</Text>
                </Pressable>
              </View>

              <TextInput
                value={current.prompt}
                onChangeText={(t) => updateQuestion("prompt", t)}
                placeholder="Type your question…"
                placeholderTextColor="#6b7686"
                style={[styles.input, { minHeight: 48 }]}
              />

              <Text style={[styles.label, { marginTop: 10 }]}>
                Choices{" "}
                <Text style={{ color: "#6b7686" }}>
                  (tap the dot to set correct)
                </Text>
              </Text>
              {current.choices.map((c, i) => {
                const isCorrect = current.answerIndex === i;
                return (
                  <View key={c.id} style={styles.choiceRow}>
                    <Pressable
                      onPress={() => updateQuestion("answerIndex", i)}
                      style={[styles.radio, isCorrect && styles.radioOn]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark choice ${i + 1} correct`}
                    />
                    <TextInput
                      value={c.text}
                      onChangeText={(t) => updateChoice(i, t)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      placeholderTextColor="#6b7686"
                      style={[styles.input, { flex: 1, marginLeft: 10 }]}
                    />
                  </View>
                );
              })}

              <Text style={[styles.label, { marginTop: 10 }]}>
                Explanation (used as hint)
              </Text>
              <TextInput
                value={current.explanation}
                onChangeText={(t) => updateQuestion("explanation", t)}
                placeholder="Hint to be revealed during quiz (optional)"
                placeholderTextColor="#6b7686"
                style={[styles.input, { minHeight: 44 }]}
              />

              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.light]}
                  onPress={deleteQuestion}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  <Text style={[styles.btnText, { color: "#ff6b6b" }]}>
                    Delete Q{editingIndex + 1}
                  </Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.primary]} onPress={saveQuiz}>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={[styles.btnText, { color: "#fff" }]}>
                    Save Quiz
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Saved header */}
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Saved Quizzes</Text>
            </View>
          </>
        }
        data={quizzes}
        keyExtractor={(q) => q.id}
        renderItem={({ item }) => (
          <View style={styles.quizItem}>
            <View style={styles.quizBadge}>
              <Ionicons name="help-buoy-outline" size={16} color="#0a84ff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quizTitle}>{item.title}</Text>
              <Text style={styles.quizMeta}>
                {item.questions.length} questions · {item.timerSeconds}s/q
              </Text>
            </View>
            <Pressable
              style={[styles.smallBtn, styles.play]}
              onPress={() => startQuiz(item)}
            >
              <Ionicons name="play" size={14} color="#fff" />
              <Text style={styles.playText}>Practice</Text>
            </Pressable>
            <Pressable
              style={[styles.smallBtn, styles.delete]}
              onPress={() =>
                Alert.alert("Delete quiz?", `Remove “${item.title}”?`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => removeQuiz(item.id),
                  },
                ])
              }
            >
              <Ionicons name="trash" size={14} color="#ff6b6b" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No quizzes yet</Text>
            <Text style={styles.emptySub}>
              Build one above and it’ll show up here.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },

  headerWrap: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderColor: "#111c27",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  // Match FlashcardsHubScreen’s button look
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

  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "900", color: "#e6edf3" },
  headerSub: { marginTop: 4, color: "#9fb0c3" },

  builderCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#0f1a26",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  label: { color: "#9fb0c3", fontWeight: "800", marginTop: 6 },
  input: {
    backgroundColor: "#0b1520",
    color: "#e6edf3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },

  timerRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  timerPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e2a36",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0f1a26",
  },
  timerPillOn: { backgroundColor: "#0a84ff22", borderColor: "#0a84ff" },
  timerPillTxt: { fontWeight: "800", color: "#e6edf3" },
  timerPillTxtOn: { color: "#0a84ff" },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e2a36",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0f1a26",
    marginRight: 6,
  },
  pillOn: { backgroundColor: "#0a84ff22", borderColor: "#0a84ff" },
  pillText: { fontWeight: "800", color: "#e6edf3" },
  pillTextOn: { color: "#0a84ff" },
  pillAdd: { flexDirection: "row", alignItems: "center", gap: 6 },
  pillAddText: { color: "#0a84ff" },

  sectionHeader: { marginTop: 10, flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#e6edf3", flex: 1 },
  deleteGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#271317",
    borderWidth: 1,
    borderColor: "#3b1c24",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteGhostText: { color: "#ff6b6b", fontWeight: "800" },

  choiceRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2a3948",
    backgroundColor: "#0f1a26",
  },
  radioOn: { borderColor: "#0a84ff", backgroundColor: "#0a84ff" },

  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
  },
  primary: { backgroundColor: "#0a84ff", borderColor: "#0a84ff" },
  light: { backgroundColor: "#0b1520", borderColor: "#3b1c24" },
  btnText: { fontWeight: "800" },

  listHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: "900", color: "#e6edf3" },

  quizItem: {
    backgroundColor: "#0f1a26",
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quizBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0b1520",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  quizTitle: { fontWeight: "900", color: "#e6edf3" },
  quizMeta: { color: "#9fb0c3", marginTop: 2, fontSize: 12 },

  smallBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  play: { backgroundColor: "#0a84ff", borderColor: "#0a84ff" },
  playText: { color: "#fff", fontWeight: "800" },
  delete: { backgroundColor: "#0b1520", borderColor: "#3b1c24" },

  emptyBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#0f1a26",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  emptyTitle: { fontWeight: "800", color: "#e6edf3", fontSize: 16 },
  emptySub: { marginTop: 4, color: "#9fb0c3" },
});
