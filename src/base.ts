
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
//import { initializeAppCheck, CustomProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyBtg0EBTCnz3by1XpgYqwKVkKgUtV_mQBE",
  authDomain: "blacdisk.firebaseapp.com",
  projectId: "blacdisk",
  storageBucket: "blacdisk.firebasestorage.app",
  messagingSenderId: "6190346018",
  appId: "1:6190346018:web:fb33201b9c68aff6627f7b",
  measurementId: "G-BMWW2PDP29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const ai = getAI(app, { backend: new GoogleAIBackend() });

// Create a `GenerativeModel` instance with a model that supports your use case.
const model = getGenerativeModel(ai, { model: "gemini-3.6-flash" });

//self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

//const analytics = getAnalytics(app);

export {model};