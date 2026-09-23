// ─────────────────────────────────────────────────────────────
// Firebase config
// Replace these values with your own from Firebase Console:
//   console.firebase.google.com → your project
//   → Project Settings → Your apps → SDK setup and configuration
// ─────────────────────────────────────────────────────────────
import { initializeApp, getApps } from '@react-native-firebase/app'

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
}

// Only initialize once
if (getApps().length === 0) {
  initializeApp(firebaseConfig)
}
