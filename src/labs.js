// Interactive drawings ("labs") shared by the chapters that use solar geometry. Each lab owns its
// state and the inputs rendered directly below its drawing; nothing is shared between labs.
import { calendarDate, formatHour } from './solar.js';

const $ = id => document.getElementById(id);
export const latLabel = l => `${Math.abs(l).toFixed(1)}°${l === 0 ? '' : l > 0 ? ' N' : ' S'}`;
const LOCATIONS = [['Ithaca, NY', 42.4], ['Phoenix, AZ', 33.4], ['Singapore', 1.3], ['Sydney', -33.9], ['Tromsø', 69.7]];
const COORD = { latitude: [90, 'N', 'S'], longitude: [180, 'W', 'E'] };
const REFERENCE_DATES = [[355, 'Dec 21'], [80, 'Mar 21'], [172, 'Jun 21'], [266, 'Sep 23']];

/** Calculation panel: rows of [symbol, expression, result, note?]. */
export function calc(id, rows) {
  const el = $(id); if (!el) return;
  el.innerHTML = rows.map(r => r === '—' ? '<hr>' : `<div class="calc-row${r[3] ? ' calc-' + r[3] : ''}"><span class="calc-k">${r[0]}</span><span class="calc-e">${r[1]}</span><span class="calc-v">${r[2]}</span></div>`).join('');
}
export const host = (id, svg) => { const el = $(id); if (el) el.innerHTML = svg; };

/* ── Inputs ────────────────────────────────────────────────────────────────
 * Each interactive drawing (a "lab") owns its state and the inputs rendered directly
 * below it. Nothing is shared between labs, so every input visibly drives its drawing. */
export const LAT = { type: 'lat' };
export const DAY = { type: 'day' };
export const HOUR = { type: 'hour' };
export const DAY_PLAY = { type: 'day', play: true };
export const range = (key, label, min, max, step, format) => ({ type: 'range', key, label, min, max, step, format });

function inputMarkup(lab, input) {
  const id = `${lab.id}-${input.key ?? input.type}`, st = lab.state;
  const row = (label, value) => `<div class="control-row"><label for="${id}">${label}</label><output id="${id}-value" for="${id}">${value}</output></div>`;
  switch (input.type) {
    case 'lat': return `<div class="input">${row('Latitude', latLabel(st.latitude))}<input id="${id}" type="range" min="-90" max="90" step="0.1" value="${st.latitude}" data-key="latitude">`
      + `<select class="input-preset" aria-label="Location preset" data-preset="latitude">${LOCATIONS.map(([name, lat]) => `<option value="${lat}"${lat === st.latitude ? ' selected' : ''}>${name} · ${latLabel(lat)}</option>`).join('')}<option value="" hidden>Custom latitude</option></select></div>`;
    case 'day': return `<div class="input">${row('Date', `${calendarDate(st.day)} · NDY ${st.day}`)}<input id="${id}" type="range" min="1" max="365" step="1" value="${st.day}" data-key="day">`
      + `<div class="segmented input-dates" role="group" aria-label="Reference dates">${REFERENCE_DATES.map(([d, name]) => `<button type="button" data-set-day="${d}" aria-pressed="${d === st.day}">${name}</button>`).join('')}</div>`
      + (input.play ? `<button type="button" class="quiet-button play-toggle" data-play="day" aria-pressed="false">${PLAY_LABEL.day}</button>` : '') + '</div>';
    case 'hour': return `<div class="input">${row('Solar time', formatHour(st.hour))}<input id="${id}" type="range" min="0" max="23.75" step="0.25" value="${st.hour}" data-key="hour">`
      + `<button type="button" class="quiet-button play-toggle" data-play="hour" aria-pressed="false">${PLAY_LABEL.hour}</button></div>`;
    case 'range': return `<div class="input">${row(input.label, input.format(st[input.key]))}<input id="${id}" type="range" min="${input.min}" max="${input.max}" step="${input.step}" value="${st[input.key]}" data-key="${input.key}"></div>`;
    case 'select': return `<div class="input"><label for="${id}">${input.label}</label><select id="${id}" data-key="${input.key}">${input.options.map(([v, t]) => `<option value="${v}"${v === st[input.key] ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
    case 'check': return `<div class="input input-check"><label class="check-label"><input id="${id}" type="checkbox" data-key="${input.key}"${st[input.key] ? ' checked' : ''}>${input.label}</label></div>`;
    case 'coord': { const [max, pos, neg] = COORD[input.key];
      return `<div class="input"><label for="${id}">${input.label}</label><div class="coord-entry"><input id="${id}" type="number" inputmode="decimal" min="0" max="${max}" step="0.1" value="${Math.abs(st[input.key])}" data-coord="${input.key}">`
        + `<select aria-label="${input.label}, hemisphere" data-hemi="${input.key}"><option value="1"${st[input.key] >= 0 ? ' selected' : ''}>${pos}</option><option value="-1"${st[input.key] < 0 ? ' selected' : ''}>${neg}</option></select></div></div>`; }
    // A dropdown of [label, state] presets; it shows "Custom" when the state matches none of them.
    case 'places': return `<div class="input"><label for="${id}">${input.label}</label><select id="${id}" class="input-preset" data-places="${lab.inputs.indexOf(input)}">${input.places.map(([t], i) => `<option value="${i}">${t}</option>`).join('')}<option value="" hidden>Custom location</option></select></div>`;
    case 'presets': return `<div class="input input-wide"><p class="small-label">${input.label}</p><div class="segmented segmented-wrap">${input.buttons.map(([t], i) => `<button type="button" data-preset-group="${lab.inputs.indexOf(input)}" data-preset-index="${i}">${t}</button>`).join('')}</div></div>`;
  }
  return '';
}

/** Reflects the lab state in its inputs (after presets, animation or reference dates). */
function syncInputs(lab) {
  const st = lab.state, root = lab.root;
  for (const el of root.querySelectorAll('[data-key]')) {
    const key = el.dataset.key;
    if (el.type === 'checkbox') el.checked = !!st[key]; else el.value = String(st[key]);
    const out = $(`${el.id}-value`), custom = lab.inputs.find(i => i.key === key);
    const shown = custom?.format ? custom.format(st[key]) : key === 'latitude' ? latLabel(st.latitude) : key === 'day' ? `${calendarDate(st.day)} · NDY ${st.day}` : key === 'hour' ? formatHour(st.hour) : undefined;
    if (out && shown !== undefined) out.textContent = shown;
    if (el.type === 'range') el.setAttribute('aria-valuetext', key === 'hour' ? `${formatHour(st.hour)} solar time` : key === 'day' ? calendarDate(st.day) : shown ?? String(st[key]));
  }
  // Typed coordinates are left alone while they are being edited.
  for (const el of root.querySelectorAll('[data-coord]')) if (el !== document.activeElement) { el.value = String(Math.round(Math.abs(st[el.dataset.coord]) * 100) / 100); el.removeAttribute('aria-invalid'); }
  for (const el of root.querySelectorAll('[data-hemi]')) el.value = st[el.dataset.hemi] < 0 ? '-1' : '1';
  for (const el of root.querySelectorAll('[data-places]')) el.value = String(placeIndex(st, lab.inputs[Number(el.dataset.places)].places));
  const preset = root.querySelector('[data-preset="latitude"]');
  if (preset) { const match = LOCATIONS.find(([, lat]) => lat === st.latitude); preset.value = match ? String(match[1]) : ''; }
  for (const b of root.querySelectorAll('[data-set-day]')) b.setAttribute('aria-pressed', String(Number(b.dataset.setDay) === st.day));
}

// Play animates one key of a lab: the solar time through a day, or the date through a year.
const PLAY_LABEL = { hour: '▶ Play day', day: '▶ Play year' };
const PLAY_STEP = { hour: st => { st.hour = (st.hour + 0.125) % 24; }, day: st => { st.day = st.day % 365 + 1; } };
let playing = null;
export function stop() {
  if (!playing) return;
  cancelAnimationFrame(playing.frame);
  playing.button.setAttribute('aria-pressed', 'false'); playing.button.textContent = PLAY_LABEL[playing.key];
  playing = null;
}
function play(lab, button) {
  const key = button.dataset.play, wasThis = playing?.button === button; stop(); if (wasThis) return;
  button.setAttribute('aria-pressed', 'true'); button.textContent = 'Ⅱ Pause';
  playing = { lab, key, button, last: performance.now(), frame: 0 };
  const interval = key === 'day' ? 50 : 90;
  const tick = now => {
    if (!playing || playing.lab !== lab) return;
    if (now - playing.last > interval) { PLAY_STEP[key](lab.state); playing.last = now; update(lab); }
    playing.frame = requestAnimationFrame(tick);
  };
  playing.frame = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
// The animation pauses when its drawing leaves the view.
const watcher = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { for (const e of entries) if (!e.isIntersecting && playing?.lab.card === e.target) stop(); }) : null;

export function update(lab) {
  syncInputs(lab);
  cancelAnimationFrame(lab.frame);
  lab.frame = requestAnimationFrame(() => lab.render(lab.state));
}

export function mount(lab) {
  lab.root = $(`in-${lab.id}`);
  if (!lab.root) return;
  lab.card = lab.root.closest('.lab') ?? lab.root;
  lab.card.classList.add('is-interactive');
  lab.root.setAttribute('role', 'group');
  lab.root.setAttribute('aria-label', 'Inputs for this drawing');
  lab.root.innerHTML = `<p class="inputs-label">INPUTS</p>${lab.inputs.map(i => inputMarkup(lab, i)).join('')}`;
  lab.root.addEventListener('input', e => {
    const key = e.target.dataset.key, preset = e.target.dataset.preset;
    if (key) { stop(); lab.state[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.tagName === 'SELECT' && isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value); update(lab); }
    else if (preset && e.target.value !== '') { stop(); lab.state[preset] = Number(e.target.value); update(lab); }
    else if (e.target.dataset.places !== undefined && e.target.value !== '') { stop(); Object.assign(lab.state, lab.inputs[Number(e.target.dataset.places)].places[Number(e.target.value)][1]); update(lab); }
    else if (e.target.closest('.coord-entry')) readCoord(lab, e.target.closest('.coord-entry'));
  });
  lab.root.addEventListener('change', e => {
    if (e.target.dataset.key && e.target.type === 'checkbox') { lab.state[e.target.dataset.key] = e.target.checked; update(lab); }
    // A typed negative value has already set the hemisphere; show it as a magnitude again.
    if (e.target.dataset.coord && !e.target.hasAttribute('aria-invalid')) e.target.value = String(Math.abs(lab.state[e.target.dataset.coord]));
  });
  lab.root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.setDay) { stop(); lab.state.day = Number(b.dataset.setDay); update(lab); }
    else if (b.hasAttribute('data-play')) play(lab, b);
    else if (b.dataset.presetIndex !== undefined) { stop(); Object.assign(lab.state, lab.inputs[Number(b.dataset.presetGroup)].buttons[Number(b.dataset.presetIndex)][1]); update(lab); }
  });
  watcher?.observe(lab.card);
  update(lab);
}

/** Index of the preset whose values all match the state (to 0.05), or '' for none. */
const placeIndex = (st, places) => { const i = places.findIndex(([, v]) => Object.entries(v).every(([k, x]) => Math.abs(st[k] - x) < .05)); return i < 0 ? '' : i; };

/** Typed LAT or LONG: a magnitude with its hemisphere. A negative number means S or E, as in the reader's sign convention. */
function readCoord(lab, entry) {
  const field = entry.querySelector('[data-coord]'), key = field.dataset.coord, v = Number(field.value), sign = Number(entry.querySelector('[data-hemi]').value);
  const valid = field.value.trim() !== '' && Number.isFinite(v) && Math.abs(v) <= COORD[key][0];
  field.toggleAttribute('aria-invalid', !valid);
  if (!valid) return;
  lab.state[key] = (v < 0 ? v : sign * v) || 0; update(lab);
}

/** Editable SVG downloads of each drawing in its current state; alias maps a button to its lab. */
export function wireExports(labs, alias = {}) {
  for (const b of document.querySelectorAll('[data-export]')) b.addEventListener('click', () => {
    const name = b.dataset.export, lab = labs.find(l => l.id === (alias[name] ?? name)), st = lab.state;
    const svg = lab.save(st, name), tag = [st.latitude !== undefined ? String(Math.round(st.latitude * 10) / 10).replace('-', 'S').replace('.', '-') : null, st.day, st.hour !== undefined ? formatHour(st.hour).replace(':', '') : null].filter(v => v !== null && v !== undefined).join('-');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), a = document.createElement('a');
    a.href = url; a.download = `es1-solar-${name}${tag ? '-' + tag : ''}.svg`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
