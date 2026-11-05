
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { Platform, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";


import { AuthProvider } from "./auth/AuthContext";

import NotesScreen from "./screens/NotesScreen";
import NoteEditorScreen from "./screens/NoteEditorScreen";
import NoteDetailScreen from "./screens/NoteDetailScreen";


import { supabase } from "./lib/supabaseClient";


import WelcomeScreen from "./screens/WelcomeScreen";
import ProgressScreen from "./screens/ProgressScreen";
import SettingsScreen from "./screens/SettingsScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import HomeScreen from "./screens/HomeScreen";
import FlashcardsHubScreen from "./screens/FlashcardsHubScreen";
import FlashcardsScreen from "./screens/FlashcardsScreen";
import DeckScreen from "./screens/DeckScreen";
import StudyPlannerScreen from "./screens/StudyPlannerScreen";
import AIFlashToolsScreen from "./screens/AIFlashToolsScreen";
import QuizzesScreen from "./screens/QuizzesScreen";
import TakeQuizScreen from "./screens/TakeQuizScreen";
import QuizSummaryScreen from "./screens/QuizSummaryScreen";


const Stack = createNativeStackNavigator();

// Make notifications show while app is foregrounded too
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function useNotificationsBootstrap() {
  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
      await Notifications.requestPermissionsAsync();
    })();
  }, []);
}

function RootNav() {
  const [startRoute, setStartRoute] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setStartRoute(session?.user ? "Home" : "Welcome");
      } catch {
        if (!mounted) return;
        setStartRoute("Welcome");
      }
    })();

    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStartRoute(session?.user ? "Home" : "Welcome");
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  // Simple splash while we decide
  if (!startRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: "#061018", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={startRoute} screenOptions={{ headerShown: false }}>
        {/* 👋 Welcome */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />

        {/* 🔐 Authentication flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

        {/* 🏠 Main app screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AIFlashTools" component={AIFlashToolsScreen} />
        <Stack.Screen name="FlashcardsHub" component={FlashcardsHubScreen} />
        <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
        <Stack.Screen name="Deck" component={DeckScreen} />
        <Stack.Screen name="StudyPlanner" component={StudyPlannerScreen} />
        <Stack.Screen name="Quizzes" component={QuizzesScreen} />
        <Stack.Screen name="TakeQuiz" component={TakeQuizScreen} />
        <Stack.Screen name="QuizSummary" component={QuizSummaryScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />

<Stack.Screen name="Notes" component={NotesScreen} />
<Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
<Stack.Screen name="NoteDetail" component={NoteDetailScreen} />



      </Stack.Navigator>
    </NavigationContainer>
  );
}

// 🟦 Wrap everything with AuthProvider
export default function App() {
  useNotificationsBootstrap();
  return (
    <AuthProvider>
      <RootNav />
    </AuthProvider>
  );
}
