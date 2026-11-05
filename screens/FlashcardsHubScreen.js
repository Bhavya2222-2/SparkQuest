// screens/FlashcardsHubScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabaseClient";

// ✅ SAMPLE DECKS with real cards (17 each)
const SAMPLE_DECKS = [
  {
    id: "s1",
    title: "AP Bio",
    last: "2d ago",
    cards: [
      { id: "ap1", term: "Cell", definition: "The basic structural and functional unit of life." },
      { id: "ap2", term: "Organelle", definition: "Specialized structure within a cell with a specific function." },
      { id: "ap3", term: "Mitochondria", definition: "Site of aerobic respiration; makes ATP." },
      { id: "ap4", term: "Chloroplast", definition: "Plant organelle where photosynthesis occurs." },
      { id: "ap5", term: "Ribosome", definition: "Builds proteins by translating mRNA." },
      { id: "ap6", term: "Nucleus", definition: "Houses DNA; controls gene expression." },
      { id: "ap7", term: "Cytoplasm", definition: "Gel-like interior where organelles reside." },
      { id: "ap8", term: "Cell Membrane", definition: "Semipermeable lipid bilayer surrounding the cell." },
      { id: "ap9", term: "ATP", definition: "Adenosine triphosphate; cell’s energy currency." },
      { id: "ap10", term: "Photosynthesis", definition: "Light + CO₂ + H₂O → Glucose + O₂." },
      { id: "ap11", term: "Cellular Respiration", definition: "Glucose + O₂ → ATP + CO₂ + H₂O." },
      { id: "ap12", term: "DNA", definition: "Double-helix genetic material storing instructions." },
      { id: "ap13", term: "RNA", definition: "Carries instructions from DNA to ribosomes." },
      { id: "ap14", term: "Gene", definition: "DNA segment coding for a protein/functional RNA." },
      { id: "ap15", term: "Enzyme", definition: "Protein catalyst that speeds reactions." },
      { id: "ap16", term: "Diffusion", definition: "Movement from high to low concentration." },
      { id: "ap17", term: "Osmosis", definition: "Diffusion of water across a membrane." },
    ],
  },
  {
    id: "s2",
    title: "SAT Vocab",
    last: "5d ago",
    cards: [
      { id: "v1", term: "Obdurate", definition: "Stubborn; refusing to change." },
      { id: "v2", term: "Ephemeral", definition: "Short-lived; fleeting." },
      { id: "v3", term: "Quixotic", definition: "Impractically idealistic." },
      { id: "v4", term: "Laconic", definition: "Using few words; terse." },
      { id: "v5", term: "Verbose", definition: "Wordy; long-winded." },
      { id: "v6", term: "Magnanimous", definition: "Generous, especially to a rival." },
      { id: "v7", term: "Ubiquitous", definition: "Present everywhere." },
      { id: "v8", term: "Catalyst", definition: "Agent that speeds change without being changed." },
      { id: "v9", term: "Obviate", definition: "To remove or prevent (a need/problem)." },
      { id: "v10", term: "Pernicious", definition: "Harmful, especially gradually." },
      { id: "v11", term: "Austere", definition: "Severe or plain in style." },
      { id: "v12", term: "Cacophony", definition: "Harsh, discordant mixture of sounds." },
      { id: "v13", term: "Garrulous", definition: "Excessively talkative on trivial matters." },
      { id: "v14", term: "Intransigent", definition: "Unwilling to compromise." },
      { id: "v15", term: "Obsequious", definition: "Excessively submissive or flattering." },
      { id: "v16", term: "Soporific", definition: "Sleep-inducing; dull." },
      { id: "v17", term: "Urbane", definition: "Polished and sophisticated." },
    ],
  },
  {
    id: "s3",
    title: "Spanish Verbs",
    last: "1d ago",
    cards: [
      { id: "sp1", term: "Hablar (yo)", definition: "Hablo" },
      { id: "sp2", term: "Hablar (tú)", definition: "Hablas" },
      { id: "sp3", term: "Hablar (él/ella)", definition: "Habla" },
      { id: "sp4", term: "Comer (yo)", definition: "Como" },
      { id: "sp5", term: "Comer (tú)", definition: "Comes" },
      { id: "sp6", term: "Comer (él/ella)", definition: "Come" },
      { id: "sp7", term: "Vivir (yo)", definition: "Vivo" },
      { id: "sp8", term: "Vivir (tú)", definition: "Vives" },
      { id: "sp9", term: "Vivir (él/ella)", definition: "Vive" },
      { id: "sp10", term: "Ir (yo)", definition: "Voy" },
      { id: "sp11", term: "Ir (tú)", definition: "Vas" },
      { id: "sp12", term: "Ir (él/ella)", definition: "Va" },
      { id: "sp13", term: "Ser (yo)", definition: "Soy" },
      { id: "sp14", term: "Ser (tú)", definition: "Eres" },
      { id: "sp15", term: "Ser (él/ella)", definition: "Es" },
      { id: "sp16", term: "Tener (yo)", definition: "Tengo" },
      { id: "sp17", term: "Tener (tú)", definition: "Tienes" },
    ],
  },
  {
    id: "s4",
    title: "Physics",
    last: "12h ago",
    cards: [
      { id: "ph1", term: "Newton’s First Law", definition: "Inertia: motion stays unless acted on by force." },
      { id: "ph2", term: "Ohm’s Law", definition: "V = I × R" },
      { id: "ph3", term: "Acceleration", definition: "a = Δv / Δt" },
      { id: "ph4", term: "Force", definition: "F = m × a" },
      { id: "ph5", term: "Work", definition: "W = F × d (parallel to displacement)" },
      { id: "ph6", term: "Kinetic Energy", definition: "KE = ½ m v²" },
      { id: "ph7", term: "Potential Energy", definition: "PE = m g h" },
      { id: "ph8", term: "Power", definition: "P = W / t" },
      { id: "ph9", term: "Voltage", definition: "Potential difference; energy per unit charge." },
      { id: "ph10", term: "Current", definition: "I = Q / t (rate of charge flow)" },
      { id: "ph11", term: "Resistance", definition: "R = V / I; opposition to current." },
      { id: "ph12", term: "Magnetic Force", definition: "F = q v B (⊥ components)" },
      { id: "ph13", term: "Coulomb’s Law", definition: "F = k q₁ q₂ / r²" },
      { id: "ph14", term: "Hooke’s Law", definition: "F = –k x (spring force)" },
      { id: "ph15", term: "Wave Speed", definition: "v = f λ" },
      { id: "ph16", term: "Frequency", definition: "Cycles per second; Hz." },
      { id: "ph17", term: "Momentum", definition: "p = m v" },
    ],
  },
];

export default function FlashcardsHubScreen({ navigation }) {
  const [userDecks, setUserDecks] = useState([]);
  const [uid, setUid] = useState("guest");

  // 🔹 Load decks from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const id = user?.id || "guest";
        setUid(id);
        const key = `@sb_decks_${id}`;
        const raw = await AsyncStorage.getItem(key);
        setUserDecks(raw ? JSON.parse(raw) : []);
      } catch {
        setUserDecks([]);
      }
    })();
  }, []);

  const goCreateDeck = () => navigation.navigate("Flashcards");

  const onStudy = (deck) =>
    navigation.navigate("Deck", {
      deckTitle: deck.title,
      cards: deck.cards,
    });

  const onEdit = (deck) =>
    navigation.navigate("Flashcards", {
      deckName: deck.title,
      prefill: deck.cards,
    });

  // 🔹 Delete a deck
  const onDelete = async (deckId) => {
    Alert.alert("Delete Deck", "Are you sure you want to delete this deck?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const key = `@sb_decks_${uid}`;
            const filtered = userDecks.filter((d) => d.id !== deckId);
            setUserDecks(filtered);
            await AsyncStorage.setItem(key, JSON.stringify(filtered));
          } catch (e) {
            Alert.alert("Error", "Failed to delete deck");
          }
        },
      },
    ]);
  };

  const renderDeck = ({ item }) => (
    <View style={styles.card}>
      {/* 🗑️ Delete icon */}
      {"id" in item && (
        <TouchableOpacity
          style={styles.deleteIcon}
          onPress={() => onDelete(item.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="trash-outline" size={18} color="#aa0b0bd9" />
        </TouchableOpacity>
      )}

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSub}>
        {(item.cards?.length ?? item.count) || 0} cards · Last studied {item.last || "—"}
      </Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.chip, { backgroundColor: "#eef5ff" }]}
          onPress={() => onStudy(item)}
        >
          <Text style={[styles.chipText, { color: "#0a84ff" }]}>Study</Text>
        </Pressable>

        <Pressable
          style={[styles.chip, { backgroundColor: "#eef5ff" }]}
          onPress={() => onEdit(item)}
        >
          <Text style={[styles.chipText, { color: "#0a84ff" }]}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color="#ffffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Create + Import buttons */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.primaryBtn} onPress={goCreateDeck}>
          <Text style={styles.primaryText}>Create deck</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Import / Scan</Text>
        </Pressable>
      </View>

      {/* 🔹 Active Cards (user decks) */}
      {userDecks.length > 0 && (
        <>
          <View style={styles.sectionSeparator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorLabel}>Active Cards</Text>
            <View style={styles.separatorLine} />
          </View>

          <FlatList
            data={userDecks}
            keyExtractor={(it) => String(it.id)}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: 14 }}
            renderItem={renderDeck}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* 🔹 Sample Cards */}
      <View style={styles.sampleSeparator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorLabel}>Sample Cards</Text>
        <View style={styles.separatorLine} />
      </View>

      <FlatList
        data={SAMPLE_DECKS}
        keyExtractor={(it) => it.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 14 }}
        renderItem={renderDeck}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1a26" },
  header: {
    paddingTop: Platform.select({ ios: 56, android: 28 }),
    paddingHorizontal: 16,
    paddingBottom: 12,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1a26",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffffff",
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

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#2073c6f4",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e6ecf5",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0b1220", fontWeight: "800" },

  sectionSeparator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sampleSeparator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    top: -0,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#dce3ed" },
  separatorLabel: {
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#66728a",
    textAlign: "center",
  },

  grid: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 14 },

  card: {
    flex: 1,
    backgroundColor: "#f6f5f5f8",
    borderRadius: CARD_RADIUS,
    padding: 16,
    minHeight: 150,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 14,
    position: "relative",
    top: -10,
  },
  deleteIcon: {
    position: "absolute",
    top: 5,
    right: 4,
    zIndex: 10,
    padding: 8,
    borderRadius: 50,
    backgroundColor: "f3efefff",
    shadowColor: "#f00000ff",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0b1220" },
  cardSub: { fontSize: 12, color: "#66728a", marginTop: 6 },
  row: { flexDirection: "row", gap: 8, marginTop: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7f3",
  },
  chipText: { fontWeight: "700" },
});
