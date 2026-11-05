// supabaseClient.js
// lib/supabaseClient.js
import 'react-native-get-random-values';
import 'expo-standard-web-crypto';
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const expoSecureStoreAdapter = {
  getItem: async (key) => {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key, value) => {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  },
  removeItem: async (key) => {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

// 🔑 Replace with your project values (from Supabase > Project Settings)
const SUPABASE_URL = 'https://hsffmmratuwfwxmnryrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZmZtbXJhdHV3Znd4bW5yeXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTM0OTksImV4cCI6MjA3NTU2OTQ5OX0.gIdLMqmA89wVPkTqX0VHl7GoBKqKmUG5bLPyXQDM6nk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Store/restore the session securely on device (Keychain)
    storage: expoSecureStoreAdapter,
    // Deep link back into the app after OAuth (Apple/Google)
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // we’ll handle redirects via makeRedirectUri
  },
});
