import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyB2r9ascpi8AnpU8nztkqOq-DhJJHDUuvA',
  authDomain:        'mydailyagent.firebaseapp.com',
  projectId:         'mydailyagent',
  storageBucket:     'mydailyagent.firebasestorage.app',
  messagingSenderId: '950079313272',
  appId:             '1:950079313272:web:7dc3935d21d1bf78cc248d',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
export const db = getFirestore(app);
export const auth = getAuth(app);
