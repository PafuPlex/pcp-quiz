const app = document.getElementById('app');

// ─── Loading / Error ──────────────────────────────────────────────────────────

export function showLoading() {
  app.innerHTML = `<div class="loading-state">Načítava sa…</div>`;
}

export function showError(message, onBack) {
  app.innerHTML = `
    <div class="error-state">
      <p class="error-message">${message}</p>
      ${onBack ? '<button class="btn btn-ghost" data-action="back">← Späť</button>' : ''}
    </div>
  `;
  app.querySelector('[data-action="back"]')?.addEventListener('click', onBack);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// `onSubmit(username, password)` returns a Promise<string|undefined>.
// A returned string is shown as an inline error; undefined means success
// and the caller has already navigated away.

export function showLogin(onSubmit, onGoRegister) {
  app.innerHTML = `
    <div class="auth-wrap">
      <h1>PCP Testy</h1>
      <p class="subtitle">Pravidlá cestnej premávky</p>
      <form class="auth-form" novalidate>
        <input class="input" type="text"     name="username" placeholder="Používateľ" autocomplete="username"         required />
        <input class="input" type="password" name="password" placeholder="Heslo"      autocomplete="current-password" required />
        <p class="form-error" aria-live="polite"></p>
        <button class="btn btn-primary btn-full" type="submit">Prihlásiť sa →</button>
      </form>
      <p class="auth-switch">
        Nemáte účet? <button class="btn-link" data-action="register">Registrovať sa</button>
      </p>
    </div>
  `;

  bindAuthForm(app, onSubmit);
  app.querySelector('[data-action="register"]')?.addEventListener('click', onGoRegister);
}

export function showRegister(onSubmit, onGoLogin) {
  app.innerHTML = `
    <div class="auth-wrap">
      <h1>PCP Testy</h1>
      <p class="subtitle">Pravidlá cestnej premávky</p>
      <form class="auth-form" novalidate>
        <input class="input" type="text"     name="username" placeholder="Používateľ" autocomplete="username"  required />
        <input class="input" type="password" name="password" placeholder="Heslo"      autocomplete="new-password" required />
        <p class="form-error" aria-live="polite"></p>
        <button class="btn btn-primary btn-full" type="submit">Registrovať sa →</button>
      </form>
      <p class="auth-switch">
        Máte účet? <button class="btn-link" data-action="login">Prihlásiť sa</button>
      </p>
    </div>
  `;

  bindAuthForm(app, onSubmit);
  app.querySelector('[data-action="login"]')?.addEventListener('click', onGoLogin);
}

function bindAuthForm(root, onSubmit) {
  const form      = root.querySelector('.auth-form');
  const errorEl   = root.querySelector('.form-error');
  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) return;

    submitBtn.disabled = true;
    errorEl.textContent = '';

    const error = await onSubmit(username, password);

    if (error) {
      errorEl.textContent = error;
      submitBtn.disabled = false;
    }
    // On success onSubmit navigates away — no action needed here.
  });
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export function showHome(overallStats, langComparison, languages, currentLang, handlers) {
  const { total, seen, accuracy, hardest } = overallStats;
  const hasAnyHistory = langComparison.some((l) => l.seen > 0);

  app.innerHTML = `
    <header class="home-header">
      <h1>PCP Testy</h1>
      <div class="header-actions">
        ${renderLangSwitcher(languages, currentLang)}
        <button class="btn-link btn-logout" data-action="logout">logout</button>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-cell">
        <div class="stat-value">${seen}</div>
        <div class="stat-label">Videných</div>
      </div>
      <div class="stat-cell">
        <div class="stat-value">${accuracy !== null ? accuracy + '%' : '—'}</div>
        <div class="stat-label">Presnosť</div>
      </div>
      <div class="stat-cell">
        <div class="stat-value">${total - seen}</div>
        <div class="stat-label">Nových</div>
      </div>
    </div>

    <button class="btn btn-primary btn-full" data-action="start">
      Začať test →
    </button>

    ${hasAnyHistory ? renderLangComparison(langComparison, currentLang) : ''}
    ${hardest.length > 0 ? renderHardest(hardest) : ''}

    ${seen > 0 ? `
      <div class="clear-row">
        <button class="btn-link" data-action="clear">Vymazať históriu jazyka</button>
      </div>
    ` : ''}
  `;

  app.querySelector('[data-action="start"]').addEventListener('click', handlers.onStart);
  app.querySelector('[data-action="logout"]').addEventListener('click', handlers.onLogout);
  app.querySelector('[data-action="clear"]')?.addEventListener('click', handlers.onClearStats);

  for (const btn of app.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => handlers.onSwitchLang(btn.dataset.lang));
  }
}

function renderLangSwitcher(languages, currentLang) {
  const buttons = languages
    .map(
      (l) => `
        <button
          class="lang-btn ${l.code === currentLang ? 'lang-btn--active' : ''}"
          data-lang="${l.code}"
          title="${l.label}"
        >${l.shortLabel}</button>
      `,
    )
    .join('');

  return `<div class="lang-switcher">${buttons}</div>`;
}

function renderLangComparison(langComparison, currentLang) {
  const active = langComparison.filter((l) => l.seen > 0);
  if (active.length === 0) return '';

  const bestAccuracy = Math.max(...active.map((l) => l.accuracy ?? 0));

  const rows = active
    .map((l) => {
      const pct = l.accuracy ?? 0;
      const isBest = l.accuracy !== null && l.accuracy === bestAccuracy && active.length > 1;
      const isCurrent = l.code === currentLang;

      return `
        <div class="lang-row ${isCurrent ? 'lang-row--current' : ''}">
          <span class="lang-row-code">${l.shortLabel}</span>
          <div class="lang-bar-wrap">
            <div class="lang-bar" style="width: ${pct}%"></div>
          </div>
          <span class="lang-row-pct">${l.accuracy !== null ? l.accuracy + '%' : '—'}</span>
          <span class="lang-row-seen">${l.seen}</span>
          ${isBest ? '<span class="lang-best-badge">best</span>' : '<span></span>'}
        </div>
      `;
    })
    .join('');

  return `
    <div class="section-label" style="margin-top: 32px; margin-bottom: 10px;">
      Porovnanie jazykov
    </div>
    <div class="card lang-comparison">${rows}</div>
  `;
}

function renderHardest(hardest) {
  const rows = hardest
    .map(
      (q) => `
        <div class="card-row">
          <span class="card-row-text">${q.text}</span>
          <span class="badge badge-error">${q.wrongCount}×</span>
        </div>
      `,
    )
    .join('');

  return `
    <div class="section-label" style="margin-top: 24px; margin-bottom: 10px;">
      Najčastejšie chyby
    </div>
    <div class="card">${rows}</div>
  `;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export function showQuestion(question, index, total, onAnswer) {
  app.innerHTML = buildQuestionHTML(question, index, total, null);

  for (const btn of app.querySelectorAll('.answer-btn')) {
    btn.addEventListener('click', () => onAnswer(Number(btn.dataset.index)));
  }
}

export function showAnswer(question, index, total, chosenIndex, onNext) {
  app.innerHTML = buildQuestionHTML(question, index, total, chosenIndex);
  app.querySelector('[data-action="next"]').addEventListener('click', onNext);
}

function buildQuestionHTML(question, index, total, chosenIndex) {
  const pct = Math.round(((index + 1) / total) * 100);
  const isAnswered = chosenIndex !== null;

  const answersHTML = question.answers
    .map((text, i) => {
      let cls = 'answer-btn';
      if (isAnswered) {
        if (i === question.correctIndex) cls += ' correct';
        else if (i === chosenIndex) cls += ' wrong';
      }
      return `
        <button class="${cls}" data-index="${i}" ${isAnswered ? 'disabled' : ''}>
          <span class="answer-label">${LABELS[i]}</span>${text}
        </button>
      `;
    })
    .join('');

  return `
    <div class="quiz-header">
      <span>${index + 1} / ${total}</span>
      <span>${pct}%</span>
    </div>
    <div class="progress"><div class="progress-fill" style="width: ${pct}%"></div></div>

    <p class="question-text">${question.text}</p>

    ${question.image ? `<img src="${question.image}" alt="" class="question-image" loading="lazy" />` : ''}

    <div class="answers">${answersHTML}</div>

    ${isAnswered ? `
      <div class="quiz-actions">
        <button class="btn btn-primary" data-action="next">
          ${index + 1 < total ? 'Ďalej →' : 'Zobraziť výsledky →'}
        </button>
      </div>
    ` : ''}
  `;
}

const LABELS = ['A', 'B', 'C', 'D'];

// ─── Results ──────────────────────────────────────────────────────────────────

export function showResults({ correct, total, wrong }, onHome, onNewTest) {
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 90;

  app.innerHTML = `
    <div class="results-score">
      <div class="score-big ${passed ? 'pass' : 'fail'}">${correct}/${total}</div>
      <div class="score-sub">${pct}% · ${passed ? 'Prešiel ✓' : 'Neprešiel ✗'}</div>
    </div>

    ${wrong.length > 0 ? renderWrongList(wrong) : ''}

    <div class="results-actions">
      <button class="btn btn-ghost" data-action="home">← Domov</button>
      <button class="btn btn-primary" data-action="new-test">Nový test →</button>
    </div>
  `;

  app.querySelector('[data-action="home"]').addEventListener('click', onHome);
  app.querySelector('[data-action="new-test"]').addEventListener('click', onNewTest);
}

function renderWrongList(wrong) {
  const items = wrong
    .map(
      ({ question }) => `
        <div class="wrong-item">
          <p class="wrong-question">${question.text}</p>
          <p class="wrong-correct">✓ ${question.answers[question.correctIndex]}</p>
        </div>
      `,
    )
    .join('');

  return `
    <div class="section-label" style="margin-bottom: 12px;">
      Chyby (${wrong.length})
    </div>
    ${items}
    <hr class="divider" />
  `;
}
