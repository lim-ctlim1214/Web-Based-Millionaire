import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

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
const auth = getAuth(app)
const provider = new GoogleAuthProvider();

async function signIn(){
    try {
        const result = await signInWithPopup(auth, provider)
        const user = result.user
    } catch (error) {
        console.log(error)
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        let loginPrompt = document.getElementById("hidden-login-text")
        loginPrompt.innerText = "Logged in as: " + user.displayName
        loginPrompt.classList.remove("hidden")
        window.location.href = "/web/home.html";
    }
})

document.getElementById("login").addEventListener("click", signIn);