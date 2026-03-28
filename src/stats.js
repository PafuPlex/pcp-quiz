// Stats are kept in an in-memory cache that mirrors the server store.
// Reads are synchronous (fast, no loading states).
// Writes update the cache immediately and sync to the server async.
import * as api from './api.js';

let cache = {};

export function initStats(serverData) {
  cache = serverData ?? {};
}

export function getLangStats(lang) {
  return cache[lang] ?? { answers: {} };
}

export function recordAnswer(lang, questionId, isCorrect) {
  const langStats = cache[lang] ?? { answers: {} };
  const entry = langStats.answers[questionId] ?? { correct: 0, wrong: 0 };

  if (isCorrect) {
    entry.correct += 1;
  } else {
    entry.wrong += 1;
  }

  langStats.answers[questionId] = entry;
  cache[lang] = langStats;

  // Fire-and-forget — a failed sync is logged but doesn't interrupt the quiz.
  api.setStore(cache).catch((err) =>
    console.error('[pcp] Stats sync failed:', err),
  );
}

export function computeLangComparison(languages) {
  return languages.map((lang) => {
    const langData = cache[lang.code] ?? { answers: {} };
    let correct = 0;
    let wrong = 0;

    for (const s of Object.values(langData.answers)) {
      correct += s.correct;
      wrong += s.wrong;
    }

    const seen = Object.keys(langData.answers).length;
    const accuracy =
      correct + wrong > 0
        ? Math.round((correct / (correct + wrong)) * 100)
        : null;

    return { ...lang, seen, accuracy };
  });
}

export async function clearLangStats(lang) {
  delete cache[lang];
  await api.setStore(cache);
}
