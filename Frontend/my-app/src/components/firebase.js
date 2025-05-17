// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // ✅ This line is critical
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDVse6b8lHO8aGSB22PEaksOc-1pIEsAf8",
  authDomain: "quickx-8a5ca.firebaseapp.com",
  projectId: "quickx-8a5ca",
  storageBucket: "quickx-8a5ca.firebasestorage.app",
  messagingSenderId: "281109322340",
  appId: "1:281109322340:web:fd62d2b883879e866a9d71",
  measurementId: "G-0YLVYPXFZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);