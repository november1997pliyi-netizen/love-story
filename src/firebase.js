// ⚠️  把下面的内容替换成你自己的 Firebase 配置
// 第三步会告诉你去哪里复制这些数字

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
