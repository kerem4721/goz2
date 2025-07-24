// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAsUnTSIfNw4GrKRtpeOJvL_7g2TDV0BDU",
    authDomain: "camk-80df2.firebaseapp.com",
    projectId: "camk-80df2",
    storageBucket: "camk-80df2.appspot.com",
    messagingSenderId: "236228053030",
    appId: "1:236228053030:web:d2d22a03fc3564c36afee7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };