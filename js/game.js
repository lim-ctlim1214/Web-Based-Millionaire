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

//TODO: FIX AUDIO FOR $100-500
//TODO: ADD IN BETWEEN SCENES.

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

let diffpanels = []

function setDiffValues(){
    let idx = 1
    difficulty_ratings.forEach(diff => {
        let value = document.createElement("div")
        value.classList.add("money-value");
        value.innerHTML = `<p>${idx} - $${diff.toLocaleString("en-US")}</p>`
        idx++
        diffpanels.push(value)
        moneyboard.appendChild(value)

    })
}


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

    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();

    const question = new Question(data.question, data.difficulty);
    data.options.forEach(optionText => {
        question.addToChoices(new Choice(optionText, optionText === data.answer));
    });

    question.choices.sort(() => Math.random() - 0.5);
    return question;
}

async function playSound(path, isBGM, isTemporarySFX, sleepSecs){
    if (isBGM){
        bgmAudio.src = `/sounds/${path}.mp3`;
        bgmAudio.play();
    } else {
        let sfxAudio = new Audio();
        sfxAudio.src = `/sounds/${path}.mp3`;
        sfxAudio.play();
        if (isTemporarySFX){
            await sleep(sleepSecs);
            sfxAudio.pause()
        }
    }

}

let activeChoiceElements = []
let choiceElementChosen
let activeQuestion

const gameholder = document.getElementById("game-holder");

function setBackground(){
    if (currentIndex === 5){
        gameholder.classList.add("secondphase")
    } else if (currentIndex === 10){
        gameholder.classList.remove("secondphase")
        gameholder.classList.add("thirdphase")
    } else if (currentIndex === 14){
        gameholder.classList.remove("thirdphase")
        gameholder.classList.add("million")
    }

}

let currentIndex = 0;
let score = 0

async function addQuestion(){
    activeChoiceElements = []
    choices.querySelectorAll(".choice").forEach(choice => {
        choice.remove()
    })
    question.innerHTML = `<p>Please wait for the game to load...</p>`
    finalAnswerButton.classList.remove("disabled")
    activeQuestion = await loadQuestion(currentIndex)

    if (activeQuestion.difficulty === 0){
        playSound("bgm/0", true)
    } else if (activeQuestion.difficulty > 4) {
        playSound("letsplay", false)
        await sleep(5000)
        playSound(`bgm/${activeQuestion.difficulty - 4}`, true)
        setBackground()
    }

    diffpanels[currentIndex].classList.add("active")
    if (currentIndex > 0){
        diffpanels[currentIndex - 1].classList.remove("active")
        diffpanels[currentIndex - 1].classList.add("answered")
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

    if (activeQuestion.difficulty < 5){
        playSound("finalanswer/0", false, true, 4000)
    } else {
        playSound(`finalanswer/${activeQuestion.difficulty - 5}`, true)
    }

    activeChoiceElements.forEach(choiceElement => {
        choiceElement.classList.add("disabled")
    })
    score = difficulty_ratings[activeQuestion.difficulty]
    if (choiceElementChosen.classList.contains("isAnswer")) {
        if (activeQuestion.difficulty < 4){
            await sleep(2000)
            playSound("win/5", false, true, 2000)
        } else {
            await sleep(4000);
            playSound(`win/${activeQuestion.difficulty}`, true)
        }

        choiceElementChosen.classList.remove("chosen")
        choiceElementChosen.classList.add("win")

        if (activeQuestion.difficulty < 4){
            await sleep(1500);
            currentIndex++;
            addQuestion()
        } else {
            if (activeQuestion.difficulty === 14){
                endGame(score)
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
    if (currentIndex <= 4) score = 0;
    else if (currentIndex <= 9) score = 1000
    else if (currentIndex <= 14) score = 32000
    endGame(score)
}

const moneyboard = document.getElementById("moneyboard");


const overlay = document.getElementById("overlay")

async function endGame(score){
    question.innerHTML = `<p>You won $${score.toLocaleString()}!</p>`
    activeChoiceElements.forEach(choiceElement => {
        choiceElement.classList.add("disabled")
    })
    finalAnswerButton.classList.add("disabled")
    await saveScore(loggedInUser, score)
    overlay.classList.add("show")
    document.getElementById("result-score").innerText = score.toLocaleString("en-US")
}
setDiffValues()

finalAnswerButton.addEventListener("click", function() {
    if (choiceElementChosen == null) return;
    finalAnswer()
})

document.getElementById("endGameButton").addEventListener("click", function(){
    playSound("win/14", true)
    endGame(score)
})

