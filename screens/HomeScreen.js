import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
  Platform,
} from "react-native";
import BottomBar from "../components/BottomBar";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabaseClient";

const STORAGE_KEY = "@studybuddy_user";
const PROFILE_KEY = "@sb_profile";

// ✅ Updated FEATURES list (Settings → Notes)
const FEATURES = [
  {
    id: "flashcards",
    title: "Flashcards",
    subtitle: "Create & review study decks",
    icon: () => (
      <MaterialCommunityIcons name="cards-outline" size={26} color="#ffb86b" />
    ),
  },
  {
    id: "quizzes",
    title: "Quizzes",
    subtitle: "Practice tests & review answers",
    icon: () => (
      <Ionicons
        name="checkmark-done-circle-outline"
        size={26}
        color="#a394ff"
      />
    ),
  },
  {
    id: "planner",
    title: "Study Planner",
    subtitle: "Set reminders and put goals",
    icon: () => <Feather name="calendar" size={26} color="#70c1b3" />,
  },
  {
    id: "progress",
    title: "Progress Tracker",
    subtitle: "See scores",
    icon: () => <Feather name="bar-chart-2" size={26} color="#ff8a8a" />,
  },
  {
    id: "ai",
    title: "AI Assistant",
    subtitle: "Use Ai to make smart flashcards & notes",
    icon: () => <Ionicons name="sparkles-outline" size={26} color="#4aa8ff" />,
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "Write and organize notes",
    icon: () => <Feather name="book-open" size={26} color="#f2c94c" />,
  },
  // screens/HomeScreen.js — FEATURES array
  // ...existing items
];

export default function HomeScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // 🔒 disable iOS back-swipe on this screen
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: false });
  }, [navigation]);

  // 🔹 Load user info
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (mounted && user?.email) setEmail(user.email);

        if (user?.id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("first_name, firstName, name")
            .eq("id", user.id)
            .maybeSingle();

          const supaName =
            prof?.first_name || prof?.firstName || prof?.name || "";
          if (mounted && supaName) setFirstName(supaName);
        }

        if (!user) {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (mounted && raw) {
            const u = JSON.parse(raw);
            setEmail(u?.email || "");
          }
          const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
          if (mounted && profileRaw) {
            const p = JSON.parse(profileRaw);
            if (p?.firstName) setFirstName(p.firstName);
          }
        }
      } catch {
        // silent fail
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Friendly name
  const name = useMemo(() => {
    if (firstName && firstName.trim() !== "") {
      return firstName.trim();
    }
    return "Student";
  }, [firstName]);

  // 🔹 Card navigation
  const onCardPress = (id, title) => {
    if (id === "ai") {
      navigation.navigate("AIFlashTools");
    } else if (id === "planner") {
      navigation.navigate("StudyPlanner");
    } else if (id === "flashcards") {
      navigation.navigate("FlashcardsHub");
    } else if (id === "quizzes") {
      navigation.navigate("Quizzes");
    } else if (id === "progress") {
      navigation.navigate("Progress");
    } else if (id === "notes") {
      navigation.navigate("Notes");
    } else {
      Alert.alert(title, "This feature is coming soon!");
    }
  };

  // 🔐 Logout
  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, PROFILE_KEY]);
    } catch {}
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const renderItem = ({ item }) => (
    <Pressable onPress={() => onCardPress(item.id, item.title)} style={styles.cardWrap}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>{item.icon()}</View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#0e1a24", "#0b1520"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarWrap}>
          {/* Cartoon astronaut image inside the circle */}
          <Image
            source={require("../assets/astronaut.png")} // place your astronaut image here
            style={styles.avatarImage}
            resizeMode="contain"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name}>{name}</Text>
        </View>

        <Pressable
          style={styles.iconBtn}
          onPress={() => setSearchOpen(true)}
          accessibilityLabel="Open search"
        >
          <Feather name="search" size={20} color="#e6edf3" />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { marginLeft: 8 }]}
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityLabel="Open menu"
        >
          <Feather name="menu" size={20} color="#e6edf3" />
        </Pressable>
      </LinearGradient>

      {/* Grid */}
      <FlatList
        data={FEATURES}
        keyExtractor={(it) => it.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 14 }}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      {/* Menu */}
      {menuOpen && (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => Alert.alert("Profile", "Coming soon")}
            >
              <Feather name="user" size={18} color="#c8d4e1" />
              <Text style={styles.menuText}>Profile</Text>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={() => setSearchOpen(true)}>
              <Feather name="search" size={18} color="#c8d4e1" />
              <Text style={styles.menuText}>Search</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("StudyPlanner");
              }}
            >
              <Feather name="calendar" size={18} color="#c8d4e1" />
              <Text style={styles.menuText}>Planner</Text>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("Notes");
              }}
            >
              <Feather name="book-open" size={18} color="#c8d4e1" />
              <Text style={styles.menuText}>Notes</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={onLogout}>
              <Feather name="log-out" size={18} color="#ff6b6b" />
              <Text style={[styles.menuText, { color: "#ff6b6b" }]}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* Search overlay */}
      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchOpen(false)}
      >
        <Pressable style={styles.searchOverlay} onPress={() => setSearchOpen(false)}>
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#8aa0b3" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search topics, decks, quizzes…"
              placeholderTextColor="#6b7686"
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </Pressable>
      </Modal>

      <BottomBar navigation={navigation} active="home" />
    </View>
  );
}

const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061018" },
  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111c27",
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    padding: 2,
    backgroundColor: "#000000ff",
    borderWidth: 2,
    borderColor: "#2d0404ff",
    justifyContent: "center",
    alignItems: "center",
  },
  // Image inside the circle
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  hello: { color: "#b5bec9ff", fontSize: 15.8, marginBottom: 2, fontWeight: "900" },
  name: { color: "#e6edf3", fontSize: 24, fontWeight: "900" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f1a26",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 14,
  },
  cardWrap: { flex: 1 },
  card: {
    backgroundColor: "#0b1520",
    borderRadius: CARD_RADIUS,
    padding: 18,
    minHeight: 210,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0f1a26",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#e6edf3" },
  cardSubtitle: { fontSize: 13, color: "#8ea0b3", marginTop: 6, lineHeight: 18 },
  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  menu: {
    position: "absolute",
    top: Platform.select({ ios: 92, android: 64 }),
    right: 12,
    width: 210,
    backgroundColor: "#0b1520",
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#1e2a36",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: { color: "#c8d4e1", fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: "#111c27", marginVertical: 4 },
  searchOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-start",
    paddingTop: Platform.select({ ios: 100, android: 70 }),
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0f1a26",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#1e2a36",
  },
  searchInput: { flex: 1, color: "#e6edf3", fontSize: 16 },
});
