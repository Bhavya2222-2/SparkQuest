// auth/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";

WebBrowser.maybeCompleteAuthSession();

const KEY_SESSION = "@sb_supabase_session";
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on launch
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY_SESSION);
        if (raw) {
          const s = JSON.parse(raw);
          setSession(s);

          // attempt refresh (nice-to-have)
          if (s?.refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token: s.access_token,
              refresh_token: s.refresh_token,
            });
            if (data?.session) {
              setSession(data.session);
              await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(data.session));
            }
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(newSession));
      } else {
        await AsyncStorage.removeItem(KEY_SESSION);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(KEY_SESSION);
  };

  // -------- OAuth (Google/Microsoft via Supabase) ----------
  // In Expo Go use the proxy (works without your standalone bundle)
  const redirectTo = AuthSession.makeRedirectUri({ useProxy: true });

  async function startOAuth(provider /* "google" | "azure" */) {
    // 1) Ask Supabase for the provider URL but don't auto-redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // IMPORTANT for RN
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("No OAuth URL returned from Supabase");

    // 2) Open provider in secure browser and wait for deep link back
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // result.type: "success" | "cancel" | "dismiss"
    // On success, Supabase finishes the exchange on the redirect and
    // onAuthStateChange above will fire with the new session.
    if (result.type === "success") {
      // Small safety: pull the session once more in case the event fires before UI is mounted
      const { data: s } = await supabase.auth.getSession();
      if (s?.session) {
        setSession(s.session);
        await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(s.session));
      }
    }

    return result;
  }

  const signInWithGoogle = () => startOAuth("google");
  const signInWithMicrosoft = () => startOAuth("azure");

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
    signInWithGoogle,
    signInWithMicrosoft,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
