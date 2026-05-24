import { initializeApp } from "firebase/app";
import {getFirestore, collection, getDocs, query, where, doc, setDoc, getDoc } from "firebase/firestore";
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
const db = getFirestore(app);
let loggedInUser;
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        loggedInUser = user;
    } else {
        window.location.href = "/index.html";
    }
})

class Choice {
    constructor(choiceText, isAnswer) {
        this.choiceText = choiceText;
        this.isAnswer = isAnswer;
    }
}

class Question {
    choices = []

    constructor(question, difficulty) {
        this.question = question;
        this.difficulty = difficulty;
    }

    addToChoices(choice) {
        this.choices.push(choice)
    }
}

const difficulty_ratings = [
    100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000,
    32000, 64000, 125000, 250000, 500000, 1000000
]


const choices = document.getElementById("choices");
const amtToWin = document.getElementById("amountToWin");
const question = document.getElementById("question")
const finalAnswerButton = document.getElementById("finalAnswerButton");
const bgmAudio = new Audio();

async function saveScore(user, amt) {
    const ref = doc(db, "leaderboard", user.uid);
    const existing = await getDoc(ref);

    if (!existing.exists()) {
        // First game ever
        await setDoc(ref, {
            username: user.displayName,
            total_score: amt
        });
    } else {

        await setDoc(ref, {
            username: user.displayName,
            total_score: existing.data().total_score + amt
        });
    }
}

async function loadQuestion(difficulty) {
    const q = query(
        collection(db, "questions"),
        where("difficulty", "==", difficulty)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Pick a random one from all questions at this difficulty
    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();

    const question = new Question(data.question, data.difficulty);
    data.options.forEach(optionText => {
        question.addToChoices(new Choice(optionText, optionText === data.answer));
    });

    return question;
}

function playSound(path, isBGM){
    if (isBGM){
        bgmAudio.src = `/sounds/${path}.mp3`;
        bgmAudio.play();
    } else {
        let sfxAudio = new Audio();
        sfxAudio.src = `/sounds/${path}.mp3`;
        sfxAudio.play();
    }
}

let activeChoiceElements = []
let choiceElementChosen
let activeQuestion

const gameholder = document.getElementById("game-holder");

function setBackground(){
    gameholder.classList.add("secondphase")
}

let currentIndex = 0;
let score = 0

async function addQuestion(){
    activeChoiceElements = []
    choices.querySelectorAll(".choice").forEach(choice => {
        choice.remove()
    })
    finalAnswerButton.classList.remove("disabled")
    activeQuestion = await loadQuestion(currentIndex)

    if (activeQuestion.difficulty <= 4){
        playSound("bgm/0", true)
    } else {
        playSound("letsplay", false)
        await sleep(5000)
        playSound(`bgm/${activeQuestion.difficulty - 4}`, true)
    }

    question.innerHTML = `<p>${activeQuestion.question}</p>`

    amtToWin.innerText = `$${difficulty_ratings[activeQuestion.difficulty].toLocaleString("en-US")}`;

    activeQuestion.choices.forEach((choice) => {
        let choiceElement = document.createElement("div");
        choiceElement.classList.add("choice");
        if (choice.isAnswer) {
            choiceElement.classList.add("isAnswer")
        }
        choiceElement.innerHTML = `<p>${choice.choiceText}</p>`;
        activeChoiceElements.push(choiceElement);

        choiceElement.addEventListener("click", () => {
            activeChoiceElements.forEach(choiceElement => {
                choiceElement.classList.remove("chosen")
            })
            choiceElement.classList.add("chosen");
            choiceElementChosen = choiceElement;
        })
        choices.append(choiceElement);
    })
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function finalAnswer(){
    finalAnswerButton.classList.add("disabled")

    if (activeQuestion.difficulty <= 5){
        playSound("finalanswer/0", true)
    } else {
        playSound(`finalanswer/${activeQuestion.difficulty - 5}`, true)
    }

    activeChoiceElements.forEach(choiceElement => {
        choiceElement.classList.add("disabled")
    })
    if (choiceElementChosen.classList.contains("isAnswer")) {
        await sleep(4000);
        if (activeQuestion.difficulty < 4){
            playSound("win/5", true)
        } else {
            playSound(`win/${activeQuestion.difficulty}`, true)
        }

        choiceElementChosen.classList.remove("chosen")
        choiceElementChosen.classList.add("win")
        score = difficulty_ratings[activeQuestion.difficulty]
        if (activeQuestion.difficulty < 4){
            await sleep(2000);
            currentIndex++;
            addQuestion()
        } else {
            if (currentIndex === 14){
                endGame()
                return
            }
            await sleep(9000)
            currentIndex++;
            addQuestion()
        }
    }
    else {
        await sleep(4000);
        playSound("loss", true)
        choiceElementChosen.classList.remove("chosen")
        choiceElementChosen.classList.add("lose")
        lost()
        activeChoiceElements.forEach(choiceElement => {
            if (choiceElement.classList.contains("isAnswer")) {
                choiceElement.classList.add("win")
            }
        })
    }
}

addQuestion()

function lost(){
    if (activeQuestion.difficulty < 4) score *= 0.5;
    if (activeQuestion.difficulty < 9) score = 1000
    if (activeQuestion.difficulty < 14) score = 32000
    endGame()
}


const overlay = document.getElementById("overlay")

async function endGame(){
    question.innerHTML = `<p>You won ${score.toLocaleString("en-US")}!</p>`
    activeChoiceElements.forEach(choiceElement => {
        choiceElement.classList.add("disabled")
    })
    finalAnswerButton.classList.add("disabled")
    await saveScore(loggedInUser, score)
    overlay.classList.add("show")
    document.getElementById("result-score").innerText = score.toLocaleString("en-US")
}

finalAnswerButton.addEventListener("click", function() {
    if (choiceElementChosen == null) return;
    finalAnswer()
})

document.getElementById("endGameButton").addEventListener("click", function(){
    endGame()
})

