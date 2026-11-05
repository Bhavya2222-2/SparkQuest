// screens/QuizSummaryScreen.js
import React, { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function QuizSummaryScreen({ route, navigation }) {
  const { quiz, selections, score: scoreIn } = route.params ?? {};
  const qz = quiz ?? route.params?.result ?? {};
  const title = qz?.title ?? "Quiz Summary";
  const questions = Array.isArray(qz?.questions) ? qz.questions : [];
  const picks = Array.isArray(selections) ? selections : [];

  const score = useMemo(() => {
    if (typeof scoreIn === "number") return scoreIn;
    return picks.reduce(
      (acc, sel, i) => acc + (sel === questions[i]?.answerIndex ? 1 : 0),
      0
    );
  }, [picks, questions, scoreIn]);

  // 🔒 Disable swipe back and back gesture
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false, // disable swipe-back on iOS
      headerShown: false, // hide any header that might have a back button
    });
  }, [navigation]);

  return (
    <View style={s.container}>
      {/* Header without back button */}
      <LinearGradient
        colors={["#0e1a24", "#0b1520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerWrap}
      >
        <View style={s.header}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
      </LinearGradient>

      {/* Score card */}
      <View style={s.scoreCard}>
        <Text style={s.scoreBig}>{score}</Text>
        <Text style={s.scoreSub}>out of {questions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        {questions.map((q, i) => {
          const userPick = picks[i];
          const correctIdx = q.answerIndex;
          const isCorrect = userPick === correctIdx;

          return (
            <View key={i} style={s.qItem}>
              <Text style={s.qTitle}>
                {i + 1}. {q.prompt}
              </Text>

              {q.choices.map((c, j) => {
                const picked = j === userPick;
                const correct = j === correctIdx;

                let row = [s.choiceRow];
                let txt = [s.choiceTxt];

                if (correct) {
                  row.push(s.choiceCorrect);
                  txt.push({ color: "#9ff7c9" });
                } else if (picked && !correct) {
                  row.push(s.choiceWrong);
                  txt.push({ color: "#ffcc9b" });
                }

                return (
                  <View key={j} style={row}>
                    <Text style={txt} numberOfLines={3}>
                      {c}
                    </Text>
                    {correct ? (
                      <Ionicons name="checkmark-circle" size={18} color="#3fe0b4" />
                    ) : picked ? (
                      <Ionicons name="close-circle" size={18} color="#ff9b5e" />
                    ) : (
                      <View style={{ width: 18 }} />
                    )}
                  </View>
                );
              })}

              {!!q.explanation && (
                <View style={s.explainBox}>
                  <Text style={s.explainTitle}>Explanation</Text>
                  <Text style={s.explainText}>{q.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Done button only */}
      <Pressable style={s.doneBtn} onPress={() => navigation.popToTop()}>
        <Text style={s.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },
  headerWrap: {
    paddingTop: Platform.select({ ios: 56, android: 36 }),
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderColor: "#111c27",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontWeight: "900",
    fontSize: 16,
    color: "#e6edf3",
    textAlign: "center",
  },
  scoreCard: {
    alignSelf: "center",
    marginTop: 12,
    backgroundColor: "#0f1a26",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "#1e2a36",
    alignItems: "center",
  },
  scoreBig: { fontSize: 32, fontWeight: "900", color: "#e6edf3" },
  scoreSub: { marginTop: 2, color: "#9fb0c3", fontWeight: "700" },
  qItem: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#0f1a26",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  qTitle: { fontWeight: "800", color: "#e6edf3", marginBottom: 8 },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0b1520",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  choiceTxt: { color: "#c8d4e1", fontWeight: "700", flex: 1, marginRight: 8 },
  choiceCorrect: { backgroundColor: "#0f2a22", borderColor: "#1e6e56" },
  choiceWrong: { backgroundColor: "#2a1c12", borderColor: "#6e3c1e" },
  explainBox: {
    marginTop: 10,
    backgroundColor: "#0b1520",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  explainTitle: { fontWeight: "900", color: "#e6edf3", marginBottom: 4 },
  explainText: { color: "#9fb0c3" },
  doneBtn: {
    margin: 16,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#0a84ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0a84ff",
  },
  doneText: { color: "#fff", fontWeight: "900" },
});
