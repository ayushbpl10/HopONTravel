import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCndctKLDOwiT08SYLlB4L2tLQ9roU6948",
  authDomain: "hopontravel-ddd9b.firebaseapp.com",
  projectId: "hopontravel-ddd9b",
  storageBucket: "hopontravel-ddd9b.firebasestorage.app",
  messagingSenderId: "792083213033",
  appId: "1:792083213033:web:25bc2d1ed9e6d779015e78"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
