import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAGrN6cKGry1QilPHDRLxYsd_8znIVhKgY",
  authDomain: "calorie-tracker-b0d91.firebaseapp.com",
  projectId: "calorie-tracker-b0d91",
  storageBucket: "calorie-tracker-b0d91.firebasestorage.app",
  messagingSenderId: "146337331494",
  appId: "1:146337331494:web:beb7eee2b6db9cb0b5e9e7",
  measurementId: "G-BGZ4XXP5F8"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)