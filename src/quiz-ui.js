// Self-test form shared by the chapters: multiple-choice and numeric questions,
// "New values" regeneration, and worked solutions when the answers are checked.
const $ = id => document.getElementById(id);

function renderQuestion(q, i) {
  const body = q.type === 'mc'
    ? `<div class="quiz-options">${q.options.map((o, j) => `<label class="quiz-option"><input type="radio" name="q${i}" value="${j}"><span>${o}</span></label>`).join('')}</div>`
    : `<div class="quiz-numeric"><label><span class="sr-only">Answer</span><input type="text" inputmode="decimal" name="q${i}" autocomplete="off" placeholder="${q.placeholder ?? 'number'}"></label><span class="unit">${q.unit ?? ''}</span><button type="button" class="quiet-button" data-new="${i}">New values ↻</button></div>`;
  return `<fieldset class="quiz-question" id="qq-${i}"><legend><span>${String(i + 1).padStart(2, '0')}</span>${q.prompt}</legend><p class="quiz-ref">${q.ref}</p>${body}<div class="quiz-feedback" id="feedback-${i}"></div></fieldset>`;
}

export function parseAnswer(raw, q) {
  const s = String(raw).trim().replace(',', '.').replace('−', '-');
  if (q.time) { const m = s.match(/^(\d{1,2})[:h](\d{2})$/); if (m) return Number(m[1]) + Number(m[2]) / 60; }
  const v = Number(s.replace(/[°a-z\s]/gi, '')); return s === '' || !Number.isFinite(v) ? null : v;
}

/** Mounts the questions into #quiz-questions and wires #quiz-form, #quiz-score and #reset-quiz. */
export function mountQuiz(questions) {
  const drawButtons = () => { for (const b of document.querySelectorAll('[data-new]')) b.onclick = () => { const i = Number(b.dataset.new); questions[i].regenerate(); $(`qq-${i}`).outerHTML = renderQuestion(questions[i], i); drawButtons(); }; };
  $('quiz-questions').innerHTML = questions.map(renderQuestion).join(''); drawButtons();
  $('quiz-form').addEventListener('submit', e => {
    e.preventDefault(); let score = 0, answered = 0;
    questions.forEach((q, i) => {
      const fb = $(`feedback-${i}`); let ok = false, given = null;
      if (q.type === 'mc') { const sel = document.querySelector(`input[name="q${i}"]:checked`); if (sel) { given = Number(sel.value); ok = given === q.correct; } }
      else { const v = parseAnswer(document.querySelector(`input[name="q${i}"]`).value, q); if (v !== null) { given = v; ok = Math.abs((q.time ? ((v - q.answer + 36) % 24) - 12 : v - q.answer)) <= q.tolerance; } }
      if (given !== null) answered++; if (ok) score++;
      fb.className = `quiz-feedback ${given === null ? 'empty' : ok ? 'correct' : 'incorrect'}`;
      fb.innerHTML = given === null ? '<p>No answer.</p>' : `<p><strong>${ok ? 'Correct.' : 'Not correct.'}</strong>${q.type === 'num' ? ` Answer: ${q.answerText}.` : ''}</p>${q.solution}`;
    });
    $('quiz-score').textContent = `${score} / ${questions.length} correct${answered < questions.length ? ` · ${questions.length - answered} unanswered` : ''}`;
  });
  $('reset-quiz').addEventListener('click', () => { $('quiz-form').reset(); for (const el of document.querySelectorAll('.quiz-feedback')) { el.innerHTML = ''; el.className = 'quiz-feedback'; } $('quiz-score').textContent = ''; });
}
