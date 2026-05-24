import { initializeApp } from "firebase/app";
import {getFirestore, collection, getDocs, query, where, getCountFromServer, doc, setDoc, getDoc, orderBy, limit } from "firebase/firestore";
import {getAuth, onAuthStateChanged} from "firebase/auth";

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await getSelf(user)

    }
})

async function getUserRank(totalScore){
    const q = query(
        collection(db, "leaderboard"),
        where("total_score", ">", totalScore)
    );

    const snapshot = await getCountFromServer(q)
    return snapshot.data().count + 1
}

async function getSelf(user){
    const ref = doc(db, "leaderboard", user.uid);
    const existing = await getDoc(ref);

    if (existing.exists()){

        const row = document.createElement("article");
        row.classList.add("lb-rank");
        row.innerHTML = `
            <p class="rank-indicator"><strong>#${await getUserRank(existing.data().total_score)}</strong></p>
            <p>${existing.data().username}</p>
            <div class="score">
                <p>${existing.data().total_score.toLocaleString("en-US")}</p>
            </div>
        `;
        row.classList.add("self");
        document.getElementById("self-rank").appendChild(row);
    }
}


const db = getFirestore(app);

async function loadLeaderboard() {
    const q = query(
        collection(db, "leaderboard"),
        orderBy("total_score", "desc"),
        limit(10)
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => doc.data());

    const leaderboardEl = document.getElementById("leaderboard");

    entries.forEach((entry, index) => {
        const row = document.createElement("article");
        row.classList.add("lb-rank");
        row.innerHTML = `
            <p class="rank-indicator"><strong>#${index + 1}</strong></p>
            <p>${entry.username}</p>
            <div class="score">
                <p>${entry.total_score.toLocaleString("en-US")}</p>
            </div>
        `;
        if (index + 1 === 1) row.classList.add("one")
        leaderboardEl.append(row);
    });
}

loadLeaderboard();