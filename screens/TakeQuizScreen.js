import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

// 🎨 palette
const P = {
  bg1: "#0f1a26",
  bg2: "#23232aff",
  card: "#19191c91",
  cardBorder: "#23232aff",
  text: "#ffffff",
  textDim: "#9fb0c3",
  accent: "#ff8a00",
  accent2: "#6a62ff",
  track: "#3b3752",
  choice: "#18191eff",
  choiceBorder: "#2c2e3a",
  choiceActiveBg: "#202231",
  choiceActiveBorder: "#5b57ff",
  radioBg: "#1f2130",
  radioBorder: "#2d2f3e",
};

// Save one progress row under the current user's key
async function appendProgressEntryPerUser(entry) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const key = user?.id ? `@sb_progress_${user.id}` : "@sb_progress_local";

    const raw = await AsyncStorage.getItem(key);
    const prev = raw ? JSON.parse(raw) : [];
    const next = [entry, ...prev].slice(0, 200);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch (e) {
    console.warn("appendProgressEntryPerUser failed", e);
  }
}

export default function TakeQuizScreen({ route, navigation }) {
  const { quiz } = route.params;
  const total = quiz?.questions?.length ?? 0;

  // ⏱ per-question time from the builder (30/60/90), default 60
  const PER_Q_LIMIT = Number(quiz?.timerSeconds || 60);

  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState(() => Array(total).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PER_Q_LIMIT);
  const [showHint, setShowHint] = useState(false);

  const q = quiz.questions[index];
  const letters = ["A", "B", "C", "D", "E", "F"];

  const timerRef = useRef(null);

  // 🚫 NEW: mark when user leaves mid-quiz so we never auto-submit/navigate
  const abortedRef = useRef(false);

  // 🔒 disable iOS back-swipe on this screen
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: false });
  }, [navigation]);

  // Track focus/blur → set/clear abort + stop timer
  useEffect(() => {
    const onFocus = () => { abortedRef.current = false; };
    const onBlur = () => {
      abortedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    const unsubFocus = navigation.addListener("focus", onFocus);
    const unsubBlur = navigation.addListener("blur", onBlur);
    return () => {
      abortedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  useEffect(() => {
    // reset timer each question
    setTimeLeft(PER_Q_LIMIT);
    setShowHint(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (!submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((s) => {
          if (abortedRef.current) return s; // 👈 do nothing if user left
          if (s <= 1) {
            clearInterval(timerRef.current);
            if (abortedRef.current) return 0; // 👈 extra safety
            if (index + 1 < total) setIndex((i) => i + 1);
            else guardedSubmit(); // 👈 use guarded submit
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, submitted, PER_Q_LIMIT]);

  const onSelect = (choiceIdx) => {
    if (submitted) return;
    setSelections((prev) => {
      const next = [...prev];
      next[index] = choiceIdx;
      return next;
    });
  };

  const nextOrSubmit = () => {
    if (submitted) return;
    if (index + 1 < total) setIndex(index + 1);
    else guardedSubmit();
  };

  // 👇 wrapper that bails if user left the screen
  const guardedSubmit = () => {
    if (abortedRef.current || !navigation.isFocused?.()) return;
    submitQuiz();
  };

  const submitQuiz = async () => {
    // stop timer
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortedRef.current) return; // 👈 never submit after leaving
    setSubmitted(true);

    // score
    const correct = selections.reduce(
      (acc, sel, i) => acc + (sel === quiz.questions[i].answerIndex ? 1 : 0),
      0
    );
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    // very simple time estimate (you can refine later with per-question tracking)
    const estimatedTimeSpent = PER_Q_LIMIT * total;

    // save per-user progress row
    try {
      const entry = {
        id: Date.now().toString(),
        quizId: quiz.id,
        title: quiz.title || "Quiz",
        finishedAt: new Date().toISOString(),
        total,
        correct,
        accuracy,
        timeLimitSeconds: PER_Q_LIMIT, // per question
        estimatedTimeSpent,
      };
      await appendProgressEntryPerUser(entry);
    } catch (e) {
      console.warn("Failed to save quiz progress", e);
    }

    // go to summary
    try {
      if (abortedRef.current || !navigation.isFocused?.()) return; // 👈 double-check
      navigation.navigate("QuizSummary", {
        quiz,
        selections,
        score: correct,
      });
    } catch (e) {
      console.warn("Navigation error", e);
    }
  };

  // ring for "X/Y"
  const countLabel = `${index + 1}/${total}`;
  const Ring = () => {
    const size = 34;
    const stroke = 4;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = total ? (index + 1) / total : 0;
    const dash = c * pct;
    return (
      <View style={styles.countWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#4a4463" strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={P.accent}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash}, ${c - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={styles.countText}>{countLabel}</Text>
      </View>
    );
  };

  const timerPct = useMemo(() => (PER_Q_LIMIT ? 1 - timeLeft / PER_Q_LIMIT : 0), [timeLeft, PER_Q_LIMIT]);

  return (
    <LinearGradient
      colors={[P.bg1, P.bg2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      {/* top bar */}
      <View style={styles.topBar}>
        {/* 👇 set abort before leaving so timer tick can't navigate */}
        <Pressable
          style={[styles.topBtn, { backgroundColor: "#00000033" }]}
          onPress={() => {
            abortedRef.current = true;
            if (timerRef.current) clearInterval(timerRef.current);
            navigation.navigate("Home");
          }}
        >
          <Ionicons name="chevron-back" size={20} color={P.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: P.text }]} numberOfLines={1}>
          {quiz.title || "Quiz"}
        </Text>
        {/* Hint toggle (uses question.explanation from builder) */}
        <Pressable
          style={[styles.topBtn, { backgroundColor: "#00000033" }]}
          onPress={() => setShowHint((v) => !v)}
        >
          <Ionicons name="bulb-outline" size={18} color={P.text} />
        </Pressable>
      </View>

      {/* main card */}
      <View style={[styles.card, { backgroundColor: P.card, borderColor: P.cardBorder }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.mutedTitle, { color: P.textDim }]}>Question</Text>
          <Ring />
        </View>

        {/* hint */}
        {showHint && !!q?.explanation && (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0a84ff" />
            <Text style={styles.hintTxt}>{q.explanation}</Text>
          </View>
        )}

        {/* question panel */}
        <LinearGradient
          colors={["#2a2546", "#2b2938"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.qPanel}
        >
          <Text
            style={[styles.qText, { color: P.text }]}
            numberOfLines={4}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {q?.prompt ?? ""}
          </Text>
        </LinearGradient>

        {/* time strip */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeLabel, { color: P.textDim }]}>Time</Text>
          <View style={[styles.timeBarWrap, { backgroundColor: P.track }]}>
            <LinearGradient
              colors={[P.accent, P.accent2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.timeBarFill, { width: `${Math.min(100, timerPct * 100)}%` }]}
            />
          </View>
          <Text style={[styles.timeVal, { color: P.text }]}>
            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </Text>
        </View>

        {/* choices */}
        <View style={{ marginTop: 10 }}>
          {(q?.choices || []).map((choice, i) => {
            const picked = selections[index] === i;
            return (
              <Pressable
                key={i}
                style={[
                  styles.choiceRow,
                  { backgroundColor: P.choice, borderColor: P.choiceBorder },
                  picked && { backgroundColor: P.choiceActiveBg, borderColor: P.choiceActiveBorder },
                ]}
                onPress={() => onSelect(i)}
              >
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: "#26283a" },
                    picked && { backgroundColor: "#2f2a63" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeTxt,
                      { color: P.text },
                      picked && { color: "#cfcaff" },
                    ]}
                  >
                    {letters[i] ?? "•"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.choiceTxt,
                    { color: P.text },
                    picked && { color: "#dcd9ff" },
                  ]}
                  numberOfLines={2}
                >
                  {typeof choice === "string" ? choice : String(choice ?? "")}
                </Text>

                <View
                  style={[
                    styles.radio,
                    { borderColor: P.radioBorder, backgroundColor: P.radioBg },
                    picked && { borderColor: P.accent2 },
                  ]}
                >
                  {picked && <View style={[styles.radioDot, { backgroundColor: P.accent2 }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* submit / next */}
      <Pressable style={styles.submitWrap} onPress={nextOrSubmit}>
        <LinearGradient
          colors={["#7926c6ff", "#328aa3e0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtn}
        >
          <Text style={styles.submitTxt}>
            {index + 1 < total ? "Next" : "Submit Answer"}
          </Text>
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    marginTop: 14,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    top: 30,
  },
  topTitle: { fontWeight: "800", fontSize: 16, top: 30 },

  card: {
    margin: 16,
    borderRadius: 9,
    padding: 14,
    height: 780,
    borderWidth: 1,
    shadowColor: "#1e1d1dff",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    top: 15,
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mutedTitle: { fontWeight: "700" },

  countWrap: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  countText: { position: "absolute", fontWeight: "800", fontSize: 10, color: "#fff" },

  hintBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2a36",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  hintTxt: { color: "#cfd8e3", flex: 1 },

  qPanel: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 92,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2f2a48",
  },
  qText: { textAlign: "center", fontSize: 20, fontWeight: "800" },

  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 14, top: 12 },
  timeLabel: { fontWeight: "800", color: "#9fb0c3" },
  timeBarWrap: { flex: 1, height: 8, borderRadius: 8, marginHorizontal: 10, overflow: "hidden" },
  timeBarFill: { height: "100%" },
  timeVal: { fontWeight: "800" },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 19,
    marginTop: 10,
    top: 20,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  badgeTxt: { fontWeight: "900" },
  choiceTxt: { flex: 1, fontWeight: "700" },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },

  submitWrap: { paddingHorizontal: 16, paddingBottom: 18 },
  submitBtn: {
    height: 54,
    borderRadius: 10,
    width: 350,
    left: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
    top: -65,
  },
  submitTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
