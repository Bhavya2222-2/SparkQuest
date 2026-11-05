// screens/StudyPlannerScreen.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { Feather } from "@expo/vector-icons";
import { Calendar, LocaleConfig } from "react-native-calendars";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabaseClient"; // ⬅️ NEW

// ---------- Locale (unchanged) ----------
LocaleConfig.locales.en = {
  monthNames: [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ],
  monthNamesShort: [
    "Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sep.","Oct.","Nov.","Dec.",
  ],
  dayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  today: "Today",
};
LocaleConfig.defaultLocale = "en";

// ---------- Storage keys and helpers ----------
const LEGACY_KEY = "@sb_planner_v1"; // old shared key

async function getPlannerKey() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ? `@sb_planner_${user.id}` : "@sb_planner_local";
  } catch {
    return "@sb_planner_local";
  }
}

async function migrateLegacyIfNeeded(targetKey) {
  try {
    if (targetKey === LEGACY_KEY) return;
    const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return;
    const targetRaw = await AsyncStorage.getItem(targetKey);
    if (targetRaw) return; // already has per-user data
    await AsyncStorage.setItem(targetKey, legacyRaw);
  } catch {}
}

// ---------- Notification helpers ----------
function buildDateFromParts(selectedISO, hourStr, minuteStr, ampm) {
  const [y, m, d] = selectedISO.split("-").map(Number);
  let h = Number(hourStr || "0");
  const mins = Number(minuteStr || "0");
  if (h < 1 || h > 12) h = 12;
  const hours24 = ampm === "PM" ? (h % 12) + 12 : h % 12;
  const date = new Date(y, m - 1, d, hours24, mins, 0, 0);

  const now = new Date();
  if (date.getTime() <= now.getTime()) {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  return date;
}

async function scheduleLocalNotification(date, title) {
  return Notifications.scheduleNotificationAsync({
    content: { title: "Study Reminder", body: title, sound: "default" },
    trigger: date,
  });
}

export default function StudyPlannerScreen({ navigation }) {
  // { [date: "YYYY-MM-DD"]: [{ id, title, time?, notificationId? }] }
  const [plans, setPlans] = useState({});
  const [selected, setSelected] = useState(dayjs().format("YYYY-MM-DD"));

  // modal state
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");

  // time inputs
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [ampm, setAmpm] = useState("AM");

  // store which key we're using now
  const [storageKey, setStorageKey] = useState(LEGACY_KEY);

  // Load plans for current (per-user) key
  const loadPlans = useCallback(async () => {
    try {
      const key = await getPlannerKey();
      // migrate old shared data once
      await migrateLegacyIfNeeded(key);
      setStorageKey(key);
      const raw = await AsyncStorage.getItem(key);
      setPlans(raw ? JSON.parse(raw) : {});
    } catch {
      setPlans({});
    }
  }, []);

  // Load on mount + whenever screen gets focus (handles user switch on same device)
  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", loadPlans);
    loadPlans();
    return () => unsub && unsub();
  }, [navigation, loadPlans]);

  // Save on change (to the user-specific key)
  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(plans)).catch(() => {});
  }, [plans, storageKey]);

  const itemsForSelected = useMemo(() => plans[selected] ?? [], [plans, selected]);

  const marked = useMemo(() => {
    const m = {};
    Object.entries(plans).forEach(([date, arr]) => {
      if (arr?.length) m[date] = { marked: true, dots: [{ color: "#0a84ff" }] };
    });
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: "#0a84ff" };
    return m;
  }, [plans, selected]);

  // open modal with a smart default time
  const openAddModal = () => {
    const now = dayjs();
    const rounded = now.minute() < 30 ? now.minute(30) : now.add(1, "hour").minute(0);
    let h = rounded.hour(); // 0..23
    const mer = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    setHour(String(h));
    setMinute(String(rounded.minute()).padStart(2, "0"));
    setAmpm(mer);
    setTitle("");
    setShowAdd(true);
  };

  const formatTime = () => {
    const hNum = Number(hour);
    const mNum = Number(minute);
    if (!hour && !minute) return ""; // optional
    if (!Number.isFinite(hNum) || !Number.isFinite(mNum) || hNum < 1 || hNum > 12 || mNum < 0 || mNum > 59) {
      return null;
    }
    return `${hNum}:${String(mNum).padStart(2, "0")} ${ampm}`;
  };

  const addPlan = async () => {
    const t = title.trim();
    if (!t) return Alert.alert("Add a title", "e.g., 'Chemistry review'");
    const timeStr = formatTime();
    if (timeStr === null) return Alert.alert("Invalid time", "Hour 1–12, minutes 00–59.");

    let notificationId = null;
    if (timeStr) {
      try {
        const runAt = buildDateFromParts(selected, hour, minute, ampm);
        notificationId = await scheduleLocalNotification(runAt, t);
      } catch {}
    }

    const newItem = {
      id: Date.now().toString(),
      title: t,
      time: timeStr || undefined,
      notificationId,
    };

    setPlans((prev) => {
      const list = prev[selected] ? [...prev[selected], newItem] : [newItem];
      return { ...prev, [selected]: list };
    });

    setShowAdd(false);
  };

  const removePlan = async (id) => {
    setPlans((prev) => {
      const list = prev[selected] || [];
      const target = list.find((i) => i.id === id);
      if (target?.notificationId) {
        Notifications.cancelScheduledNotificationAsync(target.notificationId).catch(() => {});
      }
      const nextList = list.filter((i) => i.id !== id);
      const next = { ...prev, [selected]: nextList };
      if (nextList.length === 0) delete next[selected];
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() =>
            navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")
          }
          accessibilityLabel="Go back"
          hitSlop={10}
        >
          <Feather name="chevron-left" size={24} color="#ffffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          current={selected}
          onDayPress={(d) => setSelected(d.dateString)}
          markedDates={marked}
          theme={{
            backgroundColor: "#0f1a26",
            calendarBackground: "#0f1a26",
            textSectionTitleColor: "#9fb0c3",
            monthTextColor: "#e6edf3",
            dayTextColor: "#c8d4e1",
            todayTextColor: "#0a84ff",
            selectedDayBackgroundColor: "#0a84ff",
            selectedDayTextColor: "#ffffff",
            arrowColor: "#9fb0c3",
            textDayFontWeight: "600",
            textMonthFontWeight: "900",
            textDayHeaderFontWeight: "800",
          }}
        />
      </View>

      {/* Day header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{dayjs(selected).format("dddd, MMM D")}</Text>
        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {/* Tasks list */}
      <FlatList
        data={itemsForSelected}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySub}>Tap “+ Add” to schedule something.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {!!item.time && <Text style={styles.itemTime}>{item.time}</Text>}
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => removePlan(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Add Task Modal */}
      <Modal
        visible={showAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task · {dayjs(selected).format("MMM D")}</Text>

            <TextInput
              placeholder="Title (e.g., Biology Ch.3 notes)"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholderTextColor="#6b7686"
            />

            <Text style={styles.label}>Time (optional)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.timeBox, { marginRight: 8 }]}
                placeholder="HH"
                keyboardType="number-pad"
                value={hour}
                onChangeText={(v) => setHour(v.replace(/[^\d]/g, ""))}
                maxLength={2}
                placeholderTextColor="#6b7686"
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                style={[styles.timeBox, { marginLeft: 8 }]}
                placeholder="MM"
                keyboardType="number-pad"
                value={minute}
                onChangeText={(v) => setMinute(v.replace(/[^\d]/g, ""))}
                maxLength={2}
                placeholderTextColor="#6b7686"
              />

              <View style={styles.ampmWrap}>
                <Pressable
                  style={[styles.ampmBtn, ampm === "AM" && styles.ampmActive]}
                  onPress={() => setAmpm("AM")}
                >
                  <Text style={[styles.ampmText, ampm === "AM" && styles.ampmTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.ampmBtn, ampm === "PM" && styles.ampmActive, { marginLeft: 8 }]}
                  onPress={() => setAmpm("PM")}
                >
                  <Text style={[styles.ampmText, ampm === "PM" && styles.ampmTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalRow}>
              <Pressable style={[styles.modalBtn, styles.cancel]} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.save]} onPress={addPlan}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- Styles (dark theme with your positions) ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061018",
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  calendarContainer: {
    backgroundColor: "#0f1a26",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#1e2a36",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    width: 400,
    elevation: 3,
    marginBottom: 9,
    top: 110,
    zIndex: 1,
    marginTop: -79,
  },

  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 14,
    paddingBottom: 12,
    left: -5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#061018",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    right: -15,
    fontWeight: "800",
    color: "#ffffffff",
  },

  sectionHeader: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    right: -7,
    width: 380,
    top: 120,
    zIndex: 2,
    elevation: 2,
    backgroundColor: "#0b1520",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#e6edf3" },
  addBtn: {
    backgroundColor: "#0a84ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1167c2",
  },
  addBtnText: { color: "#fff", fontWeight: "800" },

  emptyBox: {
    margin: 10,
    backgroundColor: "#0f1a26",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2a36",
    top: 135,
  },
  emptyTitle: { fontWeight: "800", color: "#e6edf3", fontSize: 16 },
  emptySub: { marginTop: 4, color: "#9fb0c3" },

  itemRow: {
    marginHorizontal: 6,
    paddingVertical: 14,
    marginBottom: 10,
    backgroundColor: "#0f1a26",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
    flexDirection: "row",
    alignItems: "center",
    top: 140,
  },
  itemTitle: { fontWeight: "700", color: "#e6edf3" },
  itemTime: { marginTop: 2, color: "#9fb0c3", fontSize: 12 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#271317",
    borderWidth: 1,
    borderColor: "#3b1c24",
    marginLeft: 10,
  },
  deleteText: { color: "#ff6b6b", fontWeight: "800" },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "90%",
    maxWidth: 440,
    backgroundColor: "#0b1520",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  modalTitle: { fontWeight: "900", fontSize: 16, color: "#e6edf3", marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 6, color: "#9fb0c3", fontWeight: "700" },

  input: {
    backgroundColor: "#0f1a26",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    color: "#e6edf3",
  },

  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  timeBox: {
    width: 64,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    backgroundColor: "#0f1a26",
    color: "#e6edf3",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
  colon: { marginHorizontal: 6, fontWeight: "900", fontSize: 18, color: "#e6edf3" },
  ampmWrap: { flexDirection: "row", marginLeft: 12 },
  ampmBtn: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e2a36",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f1a26",
  },
  ampmActive: { backgroundColor: "#0a84ff22", borderColor: "#0a84ff" },
  ampmText: { fontWeight: "800", color: "#e6edf3" },
  ampmTextActive: { color: "#0a84ff" },

  modalRow: { flexDirection: "row", marginTop: 14, gap: 10 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancel: { backgroundColor: "#0f1a26", borderWidth: 1, borderColor: "#1e2a36" },
  cancelText: { color: "#e6edf3", fontWeight: "800" },
  save: { backgroundColor: "#0a84ff", borderWidth: 1, borderColor: "#1167c2" },
  saveText: { color: "#fff", fontWeight: "800" },
});
