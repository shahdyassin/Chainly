import { initializeApp } from 'firebase/app'

export const firebaseConfig = {
  apiKey: "AIzaSyAh3Tq0WN8NXXGmqS_e8l7XEQsLRnTzzLw",
  authDomain: "chainly-f4afa.firebaseapp.com",
  databaseURL: "https://chainly-f4afa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chainly-f4afa",
  storageBucket: "chainly-f4afa.firebasestorage.app",
  messagingSenderId: "362846304463",
  appId: "1:362846304463:web:d6d24d6863e99541dd5fba",
  measurementId: "G-8PBG69GCVX"
};

export const app = initializeApp(firebaseConfig)
