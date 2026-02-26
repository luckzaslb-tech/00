import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfuTaN4yugRx25mEaAPvyrF1_8lk8dOSA",
  authDomain: "fin-nine-flax.vercel.app",
  projectId: "finance-826f6",
  storageBucket: "finance-826f6.firebasestorage.app",
  messagingSenderId: "1050683301564",
  appId: "1:1050683301564:web:243f98d688681481557ab9",
  measurementId: "G-K63Z1TR0L4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const appleProvider = new OAuthProvider("apple.com");
