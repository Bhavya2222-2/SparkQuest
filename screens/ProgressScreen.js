// screens/ProgressScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons"; // ⬅️ add Feather
import { supabase } from "../lib/supabaseClient";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line as SvgLine,
  Text as SvgText,
  G,
  Rect,
} from "react-native-svg";

/* Namespaced per-user progress key */
const PROGRESS_BASE = "@sb_progress";

/* ---------- Mini Smooth Line Chart ---------- */
function SmoothLineChart({
  data = [],
  height = 180,
  padding = 16,
  bg = "#0b1520",
  grid = "#1a2531",
}) {
  const width = 16 * 20;
  const H = height, W = width, P = padding;
  const points = data.length ? data : [60, 55, 62, 50, 68, 64, 72, 70, 78];

  const xs = points.map((_, i) => {
    const step = (W - P * 2) / Math.max(1, points.length - 1);
    return P + i * step;
    });
  const ys = points.map((v) => {
    const clamped = Math.max(0, Math.min(100, v));
    return P + (H - P * 2) * (1 - clamped / 100);
  });

  const catmullRomToBezier = (ptsX, ptsY) => {
    if (ptsX.length < 2) return "";
    let d = `M ${ptsX[0]} ${ptsY[0]}`;
    for (let i = 0; i < ptsX.length - 1; i++) {
      const p0x = i === 0 ? ptsX[0] : ptsX[i - 1];
      const p0y = i === 0 ? ptsY[0] : ptsY[i - 1];
      const p1x = ptsX[i], p1y = ptsY[i];
      const p2x = ptsX[i + 1], p2y = ptsY[i + 1];
      const p3x = i + 2 < ptsX.length ? ptsX[i + 2] : ptsX[i + 1];
      const p3y = i + 2 < ptsY.length ? ptsY[i + 2] : ptsY[i + 1];
      const c1x = p1x + (p2x - p0x) / 6, c1y = p1y + (p2y - p0y) / 6;
      const c2x = p2x - (p3x - p1x) / 6, c2y = p2y - (p3y - p1y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2x} ${p2y}`;
    }
    return d;
  };

  const pathD = catmullRomToBezier(xs, ys);
  const tickCount = Math.min(9, points.length);
  const tickEvery = Math.max(1, Math.floor(points.length / tickCount));
  const ticks = [];
  for (let i = 0; i < points.length; i += tickEvery)
    ticks.push({ i, x: xs[i], label: String(i + 1) });

  return (
    <View style={styles.chartCard}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Rect x="0" y="0" width={W} height={H} fill={bg} rx="14" />
        {[0.2, 0.4, 0.6, 0.8].map((f, k) => (
          <SvgLine key={k} x1={P} x2={W - P} y1={P + (H - P * 2) * f} y2={P + (H - P * 2) * f} stroke={grid} strokeWidth="1" />
        ))}
        <Defs>
          <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ffe66d" />
            <Stop offset="50%" stopColor="#61dafb" />
            <Stop offset="100%" stopColor="#7fffb4" />
          </SvgLinearGradient>
        </Defs>
        <Path d={pathD} stroke="url(#grad)" strokeWidth="4" fill="none" />
        <G>
          {ticks.map((t, idx) => (
            <SvgText key={idx} x={t.x} y={H - 6} fill="#7f8ea3" fontSize="10" textAnchor="middle">
              {t.label}
            </SvgText>
          ))}
        </G>
      </Svg>
      <Text style={styles.chartCaption}>Accuracy per attempt (%)</Text>
    </View>
  );
}

export default function ProgressScreen({ navigation }) {
  const [storageKey, setStorageKey] = useState(`${PROGRESS_BASE}_local`);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id ? user.id : "local";
        if (mounted) setStorageKey(`${PROGRESS_BASE}_${uid}`);
      } catch {
        if (mounted) setStorageKey(`${PROGRESS_BASE}_local`);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        setSessions(raw ? JSON.parse(raw) : []);
      } catch { setSessions([]); }
    };
    load();
  }, [storageKey]);

  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(sessions)).catch(() => {});
  }, [sessions, storageKey]);

  const stats = useMemo(() => {
    if (!sessions.length) return { attempts: 0, avgAcc: 0, bestAcc: 0, totalQ: 0, correctQ: 0 };
    const attempts = sessions.length;
    const totalQ = sessions.reduce((a, s) => a + (s.total || 0), 0);
    const correctQ = sessions.reduce((a, s) => a + (s.correct || 0), 0);
    const avgAcc = Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / attempts);
    const bestAcc = Math.max(...sessions.map((s) => s.accuracy || 0));
    return { attempts, avgAcc, bestAcc, totalQ, correctQ };
  }, [sessions]);

  const chartData = useMemo(() => [...sessions].reverse().map((s) => s.accuracy || 0), [sessions]);

  return (
    <View style={styles.container}>
      {/* ⬅️ Back + Title row (inside gradient header) */}
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

          <Text style={styles.headerTitle}>Progress</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.headerSub}>Your quiz history and stats</Text>
      </LinearGradient>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Attempts</Text>
          <Text style={styles.kpiValue}>{stats.attempts}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Accuracy</Text>
          <Text style={styles.kpiValue}>{stats.avgAcc}%</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Best Done</Text>
          <Text style={styles.kpiValue}>{stats.bestAcc}%</Text>
        </View>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Questions</Text>
          <Text style={styles.summaryValue}>{stats.correctQ}/{stats.totalQ}</Text>
        </View>
        <View style={styles.dividerV} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Correct</Text>
          <Text style={[styles.summaryValue, { color: "#3fe0b4" }]}>{stats.correctQ}</Text>
        </View>
      </View>

      {/* Chart */}
      <SmoothLineChart data={chartData} />

      {/* Attempts List */}
      <FlatList
        data={sessions}
        keyExtractor={(it) => it.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Attempts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowItem}>
            <View style={styles.rowBadge}>
              <Ionicons name="checkmark-done-outline" size={16} color="#0a84ff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>
                {item.correct}/{item.total} · {item.accuracy}% · {new Date(item.finishedAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipTxt}>{Math.round((item.estimatedTimeSpent ?? 0) / 60)}m</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No attempts yet</Text>
            <Text style={styles.emptySub}>Finish a quiz to see your progress here.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },

  header: {
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
    paddingBottom: 6,
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

  headerTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "900", color: "#e6edf3" },
  headerSub: { color: "#9fb0c3" },

  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  kpiCard: { flex: 1, backgroundColor: "transparent", borderWidth: 1, borderColor: "#1e2a36", borderRadius: 14, padding: 12 },
  kpiLabel: { color: "#9fb0c3", fontWeight: "800" },
  kpiValue: { color: "#e6edf3", fontWeight: "900", fontSize: 20, marginTop: 4 },

  summaryStrip: {
    marginTop: 12, marginHorizontal: 16, borderWidth: 1, borderColor: "#1e2a36",
    borderRadius: 14, flexDirection: "row", alignItems: "center", paddingVertical: 10,
  },
  summaryCell: { flex: 1, alignItems: "center" },
  dividerV: { width: 1, height: 28, backgroundColor: "#1e2a36" },
  summaryLabel: { color: "#9fb0c3", fontWeight: "800" },
  summaryValue: { color: "#e6edf3", fontWeight: "900", marginTop: 4 },

  chartCard: {
    marginTop: 12, marginHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: "#1e2a36", overflow: "hidden", backgroundColor: "#0b1520",
  },
  chartCaption: { color: "#7f8ea3", fontSize: 12, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },

  listHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  listTitle: { color: "#e6edf3", fontWeight: "900", fontSize: 18 },

  rowItem: {
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#1e2a36",
    borderRadius: 14, padding: 12, backgroundColor: "transparent",
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  rowBadge: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "#1e2a36",
    alignItems: "center", justifyContent: "center", backgroundColor: "#0b1520",
  },
  rowTitle: { color: "#e6edf3", fontWeight: "900" },
  rowMeta: { color: "#9fb0c3", marginTop: 2, fontSize: 12 },
  chip: { borderWidth: 1, borderColor: "#1e2a36", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "transparent" },
  chipTxt: { color: "#c8d4e1", fontWeight: "800", fontSize: 12 },

  emptyBox: {
    marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: "#1e2a36",
    borderRadius: 12, padding: 16, backgroundColor: "transparent",
  },
  emptyTitle: { color: "#e6edf3", fontWeight: "800", fontSize: 16 },
  emptySub: { color: "#9fb0c3", marginTop: 4 },
});
