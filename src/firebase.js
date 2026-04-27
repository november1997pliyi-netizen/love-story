import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDeZBNevZdOArbLpY8o9J6wPpMGNo1KyJM",
  authDomain: "let-s-fall-in-love-72dbd.firebaseapp.com",
  projectId: "let-s-fall-in-love-72dbd",
  storageBucket: "let-s-fall-in-love-72dbd.firebasestorage.app",
  messagingSenderId: "164113630325",
  appId: "1:164113630325:web:22c2ed768d3fc85513e43c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
