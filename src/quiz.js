const IMAGE_BASE =
  'https://www.minv.sk/egovinet02/PCPZobrazFile?fileName=pcpfiles/';

const QUIZ_SIZE = 40;

// Weight factors for questions that need more practice.
const WEIGHT_WRONG = 4; // each wrong answer multiplies presence in pool
const WEIGHT_UNSEEN = 2; // never-seen questions get a boost over well-known ones

// `testSets` is data[0] — the array of exam variants for a given language.
export function extractAllQuestions(testSets) {
  const seen = new Set();
  const questions = [];

  for (const testSet of testSets) {
    for (const pos of Object.keys(testSet.otazky)) {
      const q = testSet.otazky[pos][0];
      if (seen.has(q.id)) continue;
      seen.add(q.id);

      questions.push({
        id: q.id,
        text: q.text,
        image: q.obrazok ? IMAGE_BASE + q.obrazok : null,
        points: q.body,
        correctIndex: q.platna - 1, // data is 1-based
        answers: testSet.odpovede[pos].map((a) => a.odpoved),
      });
    }
  }

  return questions;
}

// Weighted reservoir sampling (Efraimidis & Spirakis algorithm A-Res).
// Each item gets a random key r^(1/w); sorting descending gives a weighted
// sample without replacement — no bias, no duplicate-weight problem.
export function buildQuiz(allQuestions, stats) {
  const scored = allQuestions.map((q) => {
    const s = stats.answers[q.id] ?? { correct: 0, wrong: 0 };
    const isUnseen = s.correct === 0 && s.wrong === 0;
    const weight = 1 + s.wrong * WEIGHT_WRONG + (isUnseen ? WEIGHT_UNSEEN : 0);
    return { q, key: Math.random() ** (1 / weight) };
  });

  return scored
    .sort((a, b) => b.key - a.key)
    .slice(0, QUIZ_SIZE)
    .map(({ q }) => shuffleAnswers(q));
}

export function computeOverallStats(allQuestions, stats) {
  const total = allQuestions.length;
  const seen = allQuestions.filter((q) => stats.answers[q.id]).length;

  let totalCorrect = 0;
  let totalWrong = 0;
  for (const s of Object.values(stats.answers)) {
    totalCorrect += s.correct;
    totalWrong += s.wrong;
  }

  const accuracy =
    totalCorrect + totalWrong > 0
      ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
      : null;

  const hardest = allQuestions
    .filter((q) => (stats.answers[q.id]?.wrong ?? 0) > 0)
    .sort(
      (a, b) =>
        (stats.answers[b.id]?.wrong ?? 0) - (stats.answers[a.id]?.wrong ?? 0),
    )
    .slice(0, 5)
    .map((q) => ({ ...q, wrongCount: stats.answers[q.id].wrong }));

  return { total, seen, accuracy, totalCorrect, totalWrong, hardest };
}

// Shuffle answer options so users memorise content, not position.
// Returns a new question object with shuffled answers and updated correctIndex.
function shuffleAnswers(question) {
  const indexed = question.answers.map((text, i) => ({
    text,
    isCorrect: i === question.correctIndex,
  }));

  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }

  return {
    ...question,
    answers: indexed.map((a) => a.text),
    correctIndex: indexed.findIndex((a) => a.isCorrect),
  };
}
