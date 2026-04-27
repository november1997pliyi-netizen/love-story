import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "在这里粘贴你的apiKey",
  authDomain: "在这里粘贴你的authDomain",
  projectId: "在这里粘贴你的projectId",
  storageBucket: "在这里粘贴你的storageBucket",
  messagingSenderId: "在这里粘贴你的messagingSenderId",
  appId: "在这里粘贴你的appId"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
