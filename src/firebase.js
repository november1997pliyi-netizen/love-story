// ⚠️  把下面的内容替换成你自己的 Firebase 配置
// 第三步会告诉你去哪里复制这些数字

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyDeZBNevZdOArbLpY8o9J6wPpMGNo1KyJM",
  authDomain: "let-s-fall-in-love-72dbd.firebaseapp.com",
  projectId: "let-s-fall-in-love-72dbd",
  storageBucket: "let-s-fall-in-love-72dbd.firebasestorage.app",
  messagingSenderId: "164113630325",
  appId: "1:164113630325:web:22c2ed768d3fc85513e43c"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// ✅ 关键：导出 Firestore 数据库
export const db = getFirestore(app);