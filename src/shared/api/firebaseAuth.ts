import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

// Firebase 웹 앱(ako-chat-web) 공개 설정값. 환경변수(VITE_FIREBASE_*)로 재정의 가능.
const firebaseConfig: FirebaseOptions = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyA5Ud96uheYt80ZWIyfgsTohNYRfkw72CA',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gdg-1234.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gdg-1234',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'gdg-1234.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '366104241528',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:366104241528:web:ffcf357720f8e45550548d',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-22T8VR1LZ1',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

export function subscribeAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function getFirebaseIdToken(
  forceRefresh = false
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
