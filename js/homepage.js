import { initializeApp } from "firebase/app";
import {getAuth, onAuthStateChanged, signOut} from "firebase/auth";
import {collection, getDocs, getFirestore, limit, orderBy, query} from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_PROJECT_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APPID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app)

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("welcome-heading").innerText = `Hi, ${user.displayName}! Welcome to Web-Based Millionaire!`;
        document.getElementById("welcome-content").innerText = `This project is inspired by the show Who Wants to be A Millionaire! You are successfully logged in through Google!`
        document.getElementById("sign-out").classList.remove("hidden");
    } else {
        document.getElementById("sign-in").classList.remove("hidden");
    }
})


document.getElementById("sign-out").addEventListener("click", async (e) => {
    await signOut(auth);
    window.location.href = "../index.html";
})

async function loadLeaderboard() {
    const q = query(
        collection(db, "leaderboard"),
        orderBy("total_score", "desc"),
        limit(3)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data());

    const rankings = document.getElementById("rankings");
    entries.forEach((entry, index) => {
        let ranking = document.createElement("article");
        ranking.innerHTML = `
            <h3>${entry.username}</h3>
            <p>${entry.total_score.toLocaleString("en-US")}</p>
        `
        ranking.classList.add("ranking");
        rankings.appendChild(ranking);
    })
}

loadLeaderboard();