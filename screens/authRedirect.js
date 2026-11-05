// authRedirect.js
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

export const getAuthRedirectUri = () => {
  // Works in Expo Go & standalone builds
  const scheme = Linking.createURL('/'); // uses your app.json/app.config.js scheme if set
  return makeRedirectUri({
    scheme: scheme.split('://')[0], // your app scheme
    native: scheme,
    preferLocalhost: true,
  });
};
