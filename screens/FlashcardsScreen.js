// screens/FlashcardsScreen.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

const makeCard = () => ({ id: Date.now() + Math.random(), term: "", definition: "" });

// Namespaced key per user so decks persist to THEIR account only
async function getDecksKey() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id || "local";
    return `@sb_decks_${uid}`;
  } catch {
    return "@sb_decks_local";
  }
}

export default function FlashcardsScreen({ navigation, route }) {
  const incoming = route?.params || null;

  const initialCards = useMemo(() => {
    if (incoming?.prefill && Array.isArray(incoming.prefill) && incoming.prefill.length) {
      return incoming.prefill.map((c) => ({
        id: Date.now() + Math.random(),
        term: (c?.term ?? "").toString(),
        definition: (c?.definition ?? "").toString(),
      }));
    }
    return [makeCard(), makeCard()];
  }, [incoming]);

  const [cards, setCards] = useState(initialCards);
  const [deckName, setDeckName] = useState((incoming?.deckName ?? "").toString());

  const updateCard = (id, field, value) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addCard = () => setCards((prev) => [...prev, makeCard()]);

  const deleteCard = () => {
    if (cards.length <= 1) {
      Alert.alert("Can't delete", "You must have at least one card.");
      return;
    }
    setCards((prev) => prev.slice(0, -1));
  };

  const saveDeck = async () => {
    const title = deckName.trim();

    const cleaned = cards
      .map((c) => ({ ...c, term: c.term.trim(), definition: c.definition.trim() }))
      .filter((c) => c.term.length > 0 || c.definition.length > 0);

    if (!title) {
      Alert.alert("Missing title", "Please name your flashcard deck.");
      return;
    }
    if (cleaned.length === 0) {
      Alert.alert("No cards", "Please add at least one flashcard.");
      return;
    }

    try {
      const key = await getDecksKey();
      const raw = await AsyncStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];

      const newDeck = {
        id: Date.now().toString(),
        title,
        count: cleaned.length,
        last: "just now",
        cards: cleaned,
      };

      const updated = [newDeck, ...existing];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed saving deck:", e);
      Alert.alert("Save failed", "Could not save your deck locally.");
      return;
    }

    navigation.navigate("Deck", {
      deckTitle: title,
      cards: cleaned,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Flashcards</Text>
      </View>

      <View style={styles.backbutton}>
        <Pressable style={[styles.topBtn, { backgroundColor: "#00000033" }]} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <TextInput
          placeholder="Title"
          value={deckName}
          onChangeText={setDeckName}
          style={styles.deckInput}
        />

        {cards.map((card, idx) => (
          <View key={card.id} style={styles.cardInput}>
            <TextInput
              placeholder={`Term ${idx + 1}`}
              value={card.term}
              onChangeText={(t) => updateCard(card.id, "term", t)}
              style={styles.termInput}
            />
            <TextInput
              placeholder={`Definition ${idx + 1}`}
              value={card.definition}
              onChangeText={(d) => updateCard(card.id, "definition", d)}
              style={styles.defInput}
              multiline
            />
          </View>
        ))}

        {/* Add / Delete buttons row */}
        <View style={styles.actionRow}>
          <Pressable style={styles.addBtn} onPress={addCard}>
            <Ionicons name="add-circle-outline" size={22} color="#0a84ff" />
            <Text style={styles.addBtnText}>Add Card</Text>
          </Pressable>

          <Pressable style={styles.deleteBtn} onPress={deleteCard}>
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        </View>

        <Pressable style={styles.saveBtn} onPress={saveDeck}>
          <Text style={styles.saveText}>Save Deck</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1a26", padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginLeft: 35,
    top: 30,
    left: 50,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", marginLeft: 13, color: "#f7f7f9ff" },
  backbutton: { top: -3, color: "#fff" },

  deckInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e6ee",
    top: 30,
  },

  cardInput: {
    backgroundColor: "#fff",
    borderRadius: 7.5,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e6ee",
    top: 30,
  },

  termInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e6ee",
    marginBottom: 8,
    paddingBottom: 4,
    marginTop: 4,
  },
  defInput: {
    minHeight: 50,
    textAlignVertical: "top",
    marginTop: 5,
  },

  // 🔹 Add & Delete row
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    top: 30,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: 190,
    justifyContent: "center",
    padding: 10,
    marginTop: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0a84ff",
  },
  addBtnText: { color: "#0a84ff", fontWeight: "700", marginLeft: 6 },

  deleteBtn: {
    flexDirection: "row",
    marginTop: 20,
    alignItems: "center",
    width: 180,
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff3b30",
    backgroundColor: "#202021ff",
  },
  deleteBtnText: { color: "#ff3b30", fontWeight: "700" },

  saveBtn: {
    backgroundColor: "#227bd4f4",
    padding: 14,
    borderRadius: 10,
    marginTop: 18,
    top: 30,
  },
  saveText: { color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 },
});
