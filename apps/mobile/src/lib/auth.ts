import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

WebBrowser.maybeCompleteAuthSession();

export { Google, GoogleAuthProvider, signInWithCredential, onAuthStateChanged, fbSignOut };
export type { User };
export { auth };

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
