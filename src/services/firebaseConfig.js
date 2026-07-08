
// src/services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// FIX: Import the persistent storage engines for React Native
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD0I84cNlCOayto9fRM1NegZkI1PPuTW_0",
  authDomain: "campusparceltracker.firebaseapp.com",
  projectId: "campusparceltracker",
  storageBucket: "campusparceltracker.firebasestorage.app",
  messagingSenderId: "872100563396",
  appId: "1:872100563396:web:b6cec4d17983e9338abc91",
  measurementId: "G-N2MKMZEBMR"
};


// Initialize Firebase App instance
const app = initializeApp(firebaseConfig);

// FIX: Initialize Auth with explicit native memory persistence lifecycle routing
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);