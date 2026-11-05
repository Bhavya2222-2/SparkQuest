// screens/DeckScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DeckScreen({ navigation, route }) {
  const title = (route?.params?.deckTitle ?? "My Flashcards").toString();
  const cards = useMemo(
    () => (Array.isArray(route?.params?.cards) ? route.params.cards : []),
    [route?.params?.cards]
  );

  // keep a flip Animated.Value for each card id
  const [flips] = useState(() => {
    const map = new Map();
    cards.forEach((c) => map.set(c.id, new Animated.Value(0)));
    return map;
  });
  const [isBack, setIsBack] = useState({}); // { [id]: true|false }

  const toggleFlip = (id) => {
    const val = flips.get(id) || new Animated.Value(0);
    const back = !!isBack[id];
    Animated.timing(val, {
      toValue: back ? 0 : 180,
      duration: 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIsBack((s) => ({ ...s, [id]: !back })));
  };

  const renderCard = (card) => {
    const val = flips.get(card.id) || new Animated.Value(0);
    const rotFront = val.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
    const rotBack  = val.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

    return (
      <View key={card.id} style={styles.cardSlot}>
        {/* FRONT */}
        <Animated.View style={[styles.card, { transform: [{ rotateY: rotFront }] }]}>
          <Text style={styles.term}>{card.term || "—"}</Text>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          pointerEvents="none"
          style={[styles.card, styles.cardBack, { transform: [{ rotateY: rotBack }] }]}
        >
          <Text style={styles.term}>{card.definition || "—"}</Text>
        </Animated.View>

        {/* tap to flip */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={RNStyleSheet.absoluteFill}
          onPress={() => toggleFlip(card.id)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={10} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="chevron-back" size={22} color="#e9e3d6" />
        </TouchableOpacity>

        <Text numberOfLines={1} style={styles.title}>{title}</Text>

        <View style={{ width: 22 }} />{/* spacer */}
      </View>

      {/* Stats + Quiz */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          <Text style={styles.statsLabel}>NUM </Text>
          {cards.length}
        </Text>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.quizBtn}
          onPress={() => navigation.navigate("Quizzes", { deckTitle: title, cards })}
          activeOpacity={0.85}
        >
          <Text style={styles.quizText}>Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* Vertical list of flippable cards */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      >
        {cards.map(renderCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const APP_BG = "#0f1a26";
const CARD_BG = "#efefedf9"; //"#efe6d3";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },

  topBar: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#e9e3d6",
    fontSize: 22,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },

  statsRow: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: { color: "#f5efdd", fontWeight: "900", letterSpacing: 0.6 },
  statsLabel: { color: "#f0e99f" },

  quizBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#141312",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#c3c1bfff",
  },
  quizText: { color: "#e9e3d6", fontWeight: "800" },

  cardSlot: {
    marginTop: 16,
    height: 220, // visible height per card like your reference
    marginBottom: 87,
  },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    marginBottom: 90,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    width: 380,
    height: 290,
    paddingHorizontal: 25,
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    backfaceVisibility: "hidden",
  },
  cardBack: {},
  term: {
    color: "#11110f",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
});
