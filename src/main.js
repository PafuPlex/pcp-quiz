import './style.css';
import { LANGUAGES, DEFAULT_LANG } from './languages.js';
import { extractAllQuestions, buildQuiz, computeOverallStats } from './quiz.js';
import { initStats, recordAnswer, getLangStats, computeLangComparison, clearLangStats } from './stats.js';
import * as api from './api.js';
import * as ui from './ui.js';

// ─── App state ────────────────────────────────────────────────────────────────

const LANG_KEY = 'pcp_lang';

let allData = null; // full data.json — loaded once, all languages inside
let currentLang = localStorage.getItem(LANG_KEY) ?? DEFAULT_LANG;
let allQuestions = [];
let currentQuiz = [];
let currentIndex = 0;
let sessionAnswers = []; // { question, isCorrect, chosenIndex }[]

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  ui.showLoading();

  // Load data.json (public, no auth) and check session in parallel.
  const [dataResult, storeResult] = await Promise.allSettled([
    fetch('/data.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} — /data.json`);
      return r.json();
    }),
    api.getStore(),
  ]);

  if (dataResult.status === 'rejected') {
    ui.showError(dataResult.reason.message, null);
    return;
  }

  allData = dataResult.value;

  if (storeResult.status === 'rejected') {
    // 401 means no valid session — show login. Any other error is unexpected.
    if (storeResult.reason.status === 401) {
      showLogin();
    } else {
      ui.showError(storeResult.reason.message, null);
    }
    return;
  }

  initStats(storeResult.value);
  switchLang(currentLang);
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Returns an error string on failure, undefined on success (navigates away).
async function handleLogin(username, password) {
  try {
    await api.login(username, password);
    const store = await api.getStore();
    initStats(store);
    switchLang(currentLang);
  } catch (err) {
    return err.status === 401 ? 'Nesprávne prihlasovacie údaje.' : 'Chyba servera.';
  }
}

async function handleRegister(username, password) {
  try {
    await api.register(username, password);
    await api.login(username, password);
    const store = await api.getStore();
    initStats(store);
    switchLang(currentLang);
  } catch (err) {
    if (err.status === 209) return 'Toto meno je už obsadené.';
    return 'Chyba pri registrácii.';
  }
}

async function handleLogout() {
  await api.logout().catch(() => {});
  initStats({});
  showLogin();
}

function showLogin() {
  ui.showLogin(handleLogin, showRegister);
}

function showRegister() {
  ui.showRegister(handleRegister, showLogin);
}

// ─── Language / screens ───────────────────────────────────────────────────────

function switchLang(langCode) {
  const lang = LANGUAGES.find((l) => l.code === langCode);
  if (!lang) return;

  currentLang = langCode;
  localStorage.setItem(LANG_KEY, langCode);
  allQuestions = extractAllQuestions(allData[lang.dataIndex]);
  goHome();
}

function goHome() {
  const langStats = getLangStats(currentLang);
  const overview = computeOverallStats(allQuestions, langStats);
  const langComparison = computeLangComparison(LANGUAGES);

  ui.showHome(overview, langComparison, LANGUAGES, currentLang, {
    onStart: startQuiz,
    onSwitchLang: switchLang,
    onClearStats: handleClearStats,
    onLogout: handleLogout,
  });
}

function startQuiz() {
  const langStats = getLangStats(currentLang);
  currentQuiz = buildQuiz(allQuestions, langStats);
  currentIndex = 0;
  sessionAnswers = [];
  showCurrentQuestion();
}

function showCurrentQuestion() {
  const question = currentQuiz[currentIndex];
  ui.showQuestion(question, currentIndex, currentQuiz.length, handleAnswer, goHome);
}

function handleAnswer(chosenIndex) {
  const question = currentQuiz[currentIndex];
  const isCorrect = chosenIndex === question.correctIndex;

  recordAnswer(currentLang, question.id, isCorrect);
  sessionAnswers.push({ question, isCorrect, chosenIndex });

  ui.showAnswer(question, currentIndex, currentQuiz.length, chosenIndex, handleNext, goHome);
}

function handleNext() {
  currentIndex += 1;

  if (currentIndex >= currentQuiz.length) {
    const wrong = sessionAnswers.filter((a) => !a.isCorrect);
    const correct = sessionAnswers.length - wrong.length;
    ui.showResults({ correct, total: sessionAnswers.length, wrong }, goHome, startQuiz);
  } else {
    showCurrentQuestion();
  }
}

async function handleClearStats() {
  const lang = LANGUAGES.find((l) => l.code === currentLang);
  if (confirm(`Vymazať históriu pre jazyk "${lang.label}"?`)) {
    await clearLangStats(currentLang);
    goHome();
  }
}
