import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA4YyIOi1xSddHCeLMdBN5mwrjQbJPn_Iw",
    authDomain: "amolnama-cc2bf.firebaseapp.com",
    projectId: "amolnama-cc2bf",
    storageBucket: "amolnama-cc2bf.firebasestorage.app",
    messagingSenderId: "283254200113",
    appId: "1:283254200113:web:248a3bff50f167568ec210"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Native Auth with AsyncStorage (replaces browserLocalPersistence)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Native Firestore (removes web-only tabManager)
const db = initializeFirestore(app, {});

export { app, auth, db };