/*
 * Dryland test logger — field sheet for the AQUAMAD dryland battery.
 *
 * No server, no accounts, no network. Everything lives in localStorage until
 * the user exports a CSV whose schema matches privado/mediciones-2026-27.csv.
 * Athletes exist as codes only (ATL-01…); names never enter this app.
 */

const STORE_KEY = 'dryland-test-logger/v1';
// 11 columns since 2026-08-11: `instrumento` was added between `intentos` and `evaluador`.
// The schema belongs to privado/mediciones-2026-27.csv, not to this app — if that file gains a
// column, this string has to follow it or the export lands misaligned.
const CSV_HEADER = 'fecha,atleta,categoria,prueba,metrica,valor,unidad,intentos,instrumento,evaluador,observaciones';
const CSV_NAME = 'mediciones-2026-27.csv';

/* ---------------------------------------------------------------- storage */

function blankDB() {
  // `codesUsed` is the graveyard: every number ever handed out, kept even when the athlete is
// gone from `athletes`. Without it, restoring an old backup could hand a dead code to a new
// swimmer and two different girls would share a row key for the season.
  return { version: 1, evaluator: 'DJ', athletes: [], codesUsed: [], records: {}, notes: {}, attempts: {}, skipped: {}, apparatus: {}, lastExport: 0, ui: {} };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankDB();
    return Object.assign(blankDB(), JSON.parse(raw));
  } catch (err) {
    console.error('no se pudo leer el almacenamiento', err);
    return blankDB();
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(db));
    } catch (err) {
      alert('No se ha podido guardar en el teléfono. Exporta ya el CSV antes de seguir.');
      console.error(err);
    }
  }, 120);
}

const db = load();

/* ------------------------------------------------------------------- util */

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const key = (date, athlete, testId, metric) => `${date}|${athlete}|${testId}|${metric}`;
const testKey = (date, athlete, testId) => `${date}|${athlete}|${testId}`;

function activeAthletes(groupId) {
  return db.athletes.filter((a) => a.group === groupId && a.active !== false).sort((a, b) => a.code.localeCompare(b.code));
}

// Each group has a reserved range that matches the printed field sheets, so the code the app
// hands out is the same one written on the paper no matter which group is registered first.
// Codes are never reused: a number freed by a dropout stays dead.
function usedNumbers() {
  const nums = db.athletes.map((a) => parseInt(String(a.code).slice(4), 10));
  for (const n of db.codesUsed || []) nums.push(parseInt(n, 10));
  return new Set(nums.filter((n) => !isNaN(n)));
}

function nextCode(groupId) {
  const fmt = (n) => `ATL-${String(n).padStart(2, '0')}`;
  const used = usedNumbers();
  const g = GROUPS.find((x) => x.id === groupId);
  if (g) {
    for (let n = g.start; n <= g.start + g.size - 1; n++) if (!used.has(n)) return fmt(n);
  }
  // Range full: an athlete the printed sheets did not foresee. Land past every code ever used
  // rather than borrowing the next group's range.
  let n = used.size ? Math.max(...used) + 1 : 1;
  while (used.has(n)) n++;
  return fmt(n);
}

// Creating an athlete is what burns the code — asking for one does not.
function claimCode(groupId) {
  const code = nextCode(groupId);
  (db.codesUsed ||= []).push(parseInt(code.slice(4), 10));
  return code;
}

// The apparatus is a property of the session, not of the athlete: on paper it is one field in
// the sheet header. Same key for every apparatus-bearing test on that date and group.
const apparatusKey = (date, groupId) => `${date}|${groupId}`;

function apparatusFor(date, groupId) {
  return db.apparatus[apparatusKey(date, groupId)] || '';
}

// Measurements of an apparatus-bearing test that were saved without saying which apparatus.
// In December a series that moves without knowing whether it was the swimmer or the bar is noise.
function missingApparatus() {
  const out = [];
  for (const r of Object.values(db.records)) {
    const t = TEST_BY_ID[r.t];
    if (!t || !t.apparatus) continue;
    if (apparatusFor(r.d, r.g)) continue;
    const k = apparatusKey(r.d, r.g);
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

// Declared rounding: whole centimetres, seconds to one decimal, degrees in 5s.
function roundFor(type, raw) {
  const n = parseFloat(String(raw).replace(',', '.'));
  if (isNaN(n)) return '';
  if (type === 'seconds') return Math.round(n * 10) / 10;
  if (type === 'deg') return Math.round(n / 5) * 5;
  return Math.round(n);
}

function getVal(date, athlete, testId, metric) {
  const r = db.records[key(date, athlete, testId, metric)];
  return r ? r.v : '';
}

function setVal(date, athlete, groupId, testId, metric, value) {
  const k = key(date, athlete, testId, metric);
  if (value === '' || value === null || value === undefined) delete db.records[k];
  else db.records[k] = { d: date, a: athlete, g: groupId, t: testId, m: metric, v: value, at: Date.now() };
  save();
}

function primaryMetrics(test) {
  return test.metrics.filter((m) => !m.atHome && !m.second);
}

function doneCount(test, athletes, date) {
  const prim = primaryMetrics(test);
  let done = 0;
  for (const a of athletes) {
    if (prim.every((m) => getVal(date, a.code, test.id, m.csv) !== '')) done++;
  }
  return done;
}

function pendingAtHome() {
  const out = [];
  const seen = new Set();
  for (const r of Object.values(db.records)) {
    const tk = testKey(r.d, r.a, r.t);
    if (seen.has(tk)) continue;
    seen.add(tk);
    const test = TEST_BY_ID[r.t];
    if (!test) continue;
    for (const m of test.metrics) {
      if (!m.atHome) continue;
      if (getVal(r.d, r.a, r.t, m.csv) !== '') continue;
      if (db.skipped[key(r.d, r.a, r.t, m.csv)]) continue;
      out.push({ date: r.d, athlete: r.a, group: r.g, test, metric: m });
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date) || x.athlete.localeCompare(y.athlete));
}

function unexportedCount() {
  return Object.values(db.records).filter((r) => r.at > (db.lastExport || 0)).length;
}

/* ------------------------------------------------------------------- csv */

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function buildCSV() {
  const order = (r) => {
    const t = TEST_BY_ID[r.t];
    const ti = TESTS.indexOf(t);
    const mi = t ? t.metrics.findIndex((m) => m.csv === r.m) : 0;
    return [r.d, r.a, String(PHASES.indexOf(t ? t.phase : '')), String(ti).padStart(3, '0'), String(mi).padStart(3, '0')].join('|');
  };
  const rows = Object.values(db.records).sort((a, b) => order(a).localeCompare(order(b)));
  const lines = [CSV_HEADER];
  for (const r of rows) {
    const test = TEST_BY_ID[r.t];
    if (!test) continue;
    const metric = test.metrics.find((m) => m.csv === r.m);
    const notes = [];
    if (metric && metric.tag) notes.push(metric.tag);
    const note = db.notes[testKey(r.d, r.a, r.t)];
    if (note) notes.push(note);
    const attempts = db.attempts[testKey(r.d, r.a, r.t)] || test.attempts || 1;
    lines.push([
      r.d, r.a, r.g, test.csv, r.m, r.v,
      metric ? metric.unit : '', attempts,
      test.apparatus ? apparatusFor(r.d, r.g) : '',
      db.evaluator || 'DJ', notes.join(' · '),
    ].map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

async function shareFile(name, text, mime) {
  const file = new File([text], name, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      // No title: iOS treats it as a second, textual item to share, and "Save to Files"
      // writes it next to the CSV as texto.txt holding just the file name (seen 2026-08-21).
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/* ------------------------------------------------------------------- view */

const ui = Object.assign({ tab: 'session', group: 'alevin', date: todayISO(), blockId: null, testId: null }, db.ui);
if (ui.date !== todayISO() && !db.ui.pinDate) ui.date = todayISO();

const $view = document.getElementById('view');
const $group = document.getElementById('group');
const $date = document.getElementById('date');
const $banner = document.getElementById('banner');
const $badge = document.getElementById('badge');

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

function persistUI() {
  db.ui = { tab: ui.tab, group: ui.group, blockId: ui.blockId, testId: ui.testId, pinDate: ui.pinDate };
  save();
}

function go(patch) {
  Object.assign(ui, patch);
  persistUI();
  render();
}

/* --------------------------------------------------------------- widgets */

let watch = null;

function stopWatch() {
  if (!watch) return;
  clearInterval(watch.timer);
  watch.btn.classList.remove('running');
  watch.btn.textContent = '⏱';
  const secs = Math.round(((Date.now() - watch.t0) / 1000) * 10) / 10;
  watch.input.value = secs;
  watch.commit(secs);
  watch = null;
}

function startWatch(btn, input, commit) {
  stopWatch();
  watch = { btn, input, commit, t0: Date.now(), timer: null };
  btn.classList.add('running');
  btn.textContent = '⏹';
  watch.timer = setInterval(() => {
    input.value = ((Date.now() - watch.t0) / 1000).toFixed(1);
  }, 100);
}

function numberField(metric, value, commit) {
  const step = metric.type === 'deg' ? 5 : metric.type === 'seconds' ? 0.1 : 1;
  const input = el('input', {
    type: 'number',
    step,
    inputmode: metric.type === 'reps' || metric.type === 'count' ? 'numeric' : 'decimal',
    value: value === '' ? '' : value,
  });
  const commitInput = () => {
    const v = input.value === '' ? '' : roundFor(metric.type, input.value);
    input.value = v;
    commit(v);
  };
  input.addEventListener('change', commitInput);
  input.addEventListener('blur', commitInput);

  const bump = (delta) => {
    const base = input.value === '' ? 0 : parseFloat(input.value);
    const v = roundFor(metric.type, Math.max(0, base + delta));
    input.value = v;
    commit(v);
  };

  const line = el('div', { class: 'inputline' });
  if (metric.type === 'seconds') {
    const btn = el('button', { class: 'watch', type: 'button', text: '⏱', title: 'Cronómetro' });
    btn.addEventListener('click', () => (watch && watch.btn === btn ? stopWatch() : startWatch(btn, input, commit)));
    line.append(btn, input);
  } else {
    line.append(
      el('button', { class: 'step', type: 'button', text: '−', onclick: () => bump(-step) }),
      input,
      el('button', { class: 'step', type: 'button', text: '+', onclick: () => bump(step) })
    );
  }
  return line;
}

function levelField(metric, value, commit) {
  const wrap = el('div', { class: 'levels' });
  const options = metric.type === 'rpe' ? [...Array(11).keys()] : metric.rubric.map((_, i) => i);
  for (const n of options) {
    const b = el('button', { type: 'button', text: String(n), class: String(value) === String(n) ? 'on' : '' });
    b.addEventListener('click', () => {
      const next = String(value) === String(n) ? '' : n;
      commit(next);
      render();
    });
    wrap.appendChild(b);
  }
  return wrap;
}

function flagField(value, commit) {
  const on = value === 'si';
  const b = el('button', { type: 'button', class: 'toggle' + (on ? ' on' : ''), text: on ? '✓ hecho' : 'marcar' });
  b.addEventListener('click', () => {
    commit(on ? '' : 'si');
    render();
  });
  return b;
}

function fieldFor(metric, date, athlete, groupId, test) {
  const value = getVal(date, athlete, test.id, metric.csv);
  const commit = (v) => setVal(date, athlete, groupId, test.id, metric.csv, v);
  const box = el('div', { class: 'field' }, [el('label', { text: metric.label })]);
  if (metric.type === 'flag') box.appendChild(flagField(value, commit));
  else if (metric.type === 'level' || metric.type === 'rpe') box.appendChild(levelField(metric, value, commit));
  else box.appendChild(numberField(metric, value, commit));
  return box;
}

/* ------------------------------------------------------------- room clock */

/* One clock the whole room reads, on a device nobody touches — the iPad on a bench.
   A partner with no device can produce a count and a moment, never a duration, so
   every hold test becomes "read the number when the criterion breaks and call it
   out". Nothing here writes data: it is a clock, not a screen of the app. */
const roomClock = { t0: 0, acc: 0, running: false, timer: null, lock: null };

function roomClockPaint() {
  const ms = roomClock.acc + (roomClock.running ? Date.now() - roomClock.t0 : 0);
  const tenths = Math.floor(ms / 100);
  document.getElementById('clockSecs').textContent = Math.floor(tenths / 10);
  document.getElementById('clockTenths').textContent = '.' + (tenths % 10);
}

function roomClockToggle() {
  if (roomClock.running) {
    roomClock.acc += Date.now() - roomClock.t0;
    roomClock.running = false;
    clearInterval(roomClock.timer);
    roomClock.timer = null;
  } else {
    roomClock.t0 = Date.now();
    roomClock.running = true;
    roomClock.timer = setInterval(roomClockPaint, 50);
  }
  document.getElementById('clock').classList.toggle('idle', !roomClock.running);
  roomClockPaint();
}

function roomClockZero() {
  roomClock.acc = 0;
  roomClock.t0 = Date.now();
  roomClockPaint();
}

async function roomClockOpen() {
  stopWatch();
  document.getElementById('clock').classList.add('on');
  roomClockPaint();
  // A sleeping iPad mid-wave loses the measurement of everyone still holding.
  try { roomClock.lock = await navigator.wakeLock.request('screen'); } catch (e) { roomClock.lock = null; }
}

function roomClockClose() {
  if (roomClock.running) roomClockToggle();
  document.getElementById('clock').classList.remove('on');
  if (roomClock.lock) { roomClock.lock.release().catch(() => {}); roomClock.lock = null; }
}

/* ----------------------------------------------------------------- screens */

function screenBlocks() {
  const blocks = blocksForGroup(ui.group);
  const athletes = activeAthletes(ui.group);
  const frag = document.createDocumentFragment();
  frag.appendChild(el('h2', { text: 'Qué se captura hoy' }));
  frag.appendChild(el('p', { class: 'note', text: `${athletes.length} nadadoras activas en ${GROUPS.find((g) => g.id === ui.group).label}. Elige el bloque de la sesión.` }));

  const clockBtn = el('button', { class: 'btn', type: 'button', text: '⏱ Reloj de sala' });
  clockBtn.addEventListener('click', roomClockOpen);
  frag.appendChild(clockBtn);
  frag.appendChild(el('p', { class: 'note', text: 'Para las pruebas de aguante: se abre en el iPad, se apoya donde lo vean todas y no lo toca nadie. Arrancan a la vez y cada compañera canta el código y el número cuando se rompe el criterio.' }));

  if (!athletes.length) {
    frag.appendChild(el('div', { class: 'criterion', text: 'Todavía no hay nadadoras en este grupo. Ve a la pestaña Nadadoras y añádelas: el código se asigna por orden de aparición, nunca por el nombre.' }));
  }

  for (const b of blocks) {
    const total = b.tests.length * athletes.length;
    const done = b.tests.reduce((sum, id) => sum + doneCount(TEST_BY_ID[id], athletes, ui.date), 0);
    const card = el('button', { class: 'card tap', type: 'button' }, [
      el('div', { class: 'head' }, [
        el('strong', { text: b.label }),
        el('span', { class: 'pill' + (total && done === total ? ' ok' : ''), text: total ? `${done}/${total}` : '—' }),
      ]),
      el('div', { class: 'sub', text: `${b.hint} · ${b.tests.map((id) => TEST_BY_ID[id].label).join(' · ')}` }),
      el('div', { class: 'bar' }, [el('i', { style: `width:${total ? (done / total) * 100 : 0}%` })]),
    ]);
    card.addEventListener('click', () => go({ blockId: b.id, testId: null }));
    frag.appendChild(card);
  }
  return frag;
}

function screenTests(block) {
  const athletes = activeAthletes(ui.group);
  const frag = document.createDocumentFragment();
  frag.appendChild(el('button', { class: 'back', type: 'button', text: '‹ Bloques', onclick: () => go({ blockId: null }) }));
  frag.appendChild(el('h2', { text: block.label }));
  frag.appendChild(el('p', { class: 'note', text: 'Orden fijo de menos a más fatigante: movilidad → control → fuerza → potencia → resistencia. Ve rotando parejas dentro de cada prueba.' }));

  for (const id of block.tests) {
    const test = TEST_BY_ID[id];
    const done = doneCount(test, athletes, ui.date);
    const card = el('button', { class: 'card tap', type: 'button' }, [
      el('div', { class: 'head' }, [
        el('strong', { text: test.label }),
        el('span', {
          class: 'pill' + (test.blocked ? ' blocked' : done === athletes.length && athletes.length ? ' ok' : ''),
          text: test.blocked ? 'sin barra' : `${done}/${athletes.length}`,
        }),
      ]),
      el('div', { class: 'sub', text: `${test.phase} · ${test.who}` }),
      el('div', { class: 'bar' }, [el('i', { style: `width:${athletes.length ? (done / athletes.length) * 100 : 0}%` })]),
    ]);
    card.addEventListener('click', () => go({ testId: id }));
    frag.appendChild(card);
  }
  return frag;
}

function screenTestDetail(block, test) {
  const athletes = activeAthletes(ui.group);
  const frag = document.createDocumentFragment();
  frag.appendChild(el('button', { class: 'back', type: 'button', text: '‹ ' + block.label, onclick: () => go({ testId: null }) }));
  frag.appendChild(el('h2', { text: test.label }));

  const crit = el('div', { class: 'criterion' + (test.blocked ? ' blocked' : '') });
  if (test.blocked) crit.appendChild(el('div', { html: '<strong>🔴 ' + test.blocked + '</strong>' }));
  crit.appendChild(el('div', { text: test.criterion }));
  if (test.attempts) crit.appendChild(el('div', { text: `Intentos declarados: ${test.attempts}.` }));
  const rubric = test.metrics.find((m) => m.rubric);
  if (rubric) crit.appendChild(el('div', { class: 'rubric', html: rubric.rubric.join('<br>') }));
  frag.appendChild(crit);

  if (test.apparatus) {
    const chosen = apparatusFor(ui.date, ui.group);
    const box = el('div', { class: 'criterion' + (chosen ? '' : ' blocked') });
    box.appendChild(el('div', { html: chosen ? '<strong>Aparato: ' + chosen + '</strong>' : '<strong>🔴 Di en qué aparato se mide, antes de apuntar</strong>' }));
    box.appendChild(el('div', { text: 'Va a la columna instrumento del CSV. Una elevación en espaldera y una en barra no son el mismo gesto: sin este dato, en diciembre no sabrás si cambió la nadadora o el aparato.' }));
    const pills = el('div', { class: 'fields' });
    for (const opt of test.apparatus) {
      pills.appendChild(el('button', {
        class: 'pill' + (chosen === opt ? ' ok' : ''), type: 'button', text: opt,
        onclick: () => {
          const k = apparatusKey(ui.date, ui.group);
          if (db.apparatus[k] === opt) delete db.apparatus[k];
          else db.apparatus[k] = opt;
          save();
          render();
        },
      }));
    }
    box.appendChild(pills);
    frag.appendChild(box);
  }

  const prim = primaryMetrics(test);
  // Video-derived metrics also live here, one tap away: My Jump Lab does not keep a
  // recoverable series, so whatever it gives has to be typed in the moment it appears.
  const second = test.metrics.filter((m) => m.second || m.atHome);

  for (const a of athletes) {
    const complete = prim.every((m) => getVal(ui.date, a.code, test.id, m.csv) !== '');
    const row = el('div', { class: 'athlete' + (complete ? ' done' : '') });
    row.appendChild(el('div', { class: 'who' }, [
      el('span', { class: 'code', text: a.code }),
      el('span', { class: 'pill' + (complete ? ' ok' : ''), text: complete ? '✓' : 'pendiente' }),
    ]));

    const fields = el('div', { class: 'fields' });
    for (const m of prim) fields.appendChild(fieldFor(m, ui.date, a.code, ui.group, test));
    row.appendChild(fields);

    if (test.asymmetry) {
      const [x, y] = test.asymmetry.map((c) => getVal(ui.date, a.code, test.id, c));
      if (x !== '' && y !== '') {
        const diff = Math.abs(x - y);
        row.appendChild(el('div', { class: 'asym' + (diff >= 5 ? ' high' : ''), text: `Asimetría: ${diff} cm${diff >= 5 ? ' — diferencia grande entre lados' : ''}` }));
      }
    }

    const extra = el('details');
    const hasVideo = second.some((m) => m.atHome);
    extra.appendChild(el('summary', { text: hasVideo ? 'Más métricas, vídeo, nota e intentos' : 'Más métricas, nota e intentos' }));
    if (second.length) {
      const sf = el('div', { class: 'fields' });
      for (const m of second) {
        const f = fieldFor(m, ui.date, a.code, ui.group, test);
        if (m.atHome) f.querySelector('label').textContent += m.tag ? ` · ${m.tag}` : ' · de vídeo';
        sf.appendChild(f);
      }
      extra.appendChild(sf);
    }
    const tk = testKey(ui.date, a.code, test.id);
    const attemptsInput = el('input', {
      type: 'number', min: 1, step: 1, inputmode: 'numeric',
      value: db.attempts[tk] || test.attempts || 1,
    });
    attemptsInput.addEventListener('change', () => {
      db.attempts[tk] = Math.max(1, parseInt(attemptsInput.value, 10) || 1);
      save();
    });
    extra.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Intentos usados' }), el('div', { class: 'inputline' }, [attemptsInput])]));

    const note = el('textarea', { placeholder: 'Observación (va al CSV)' });
    note.value = db.notes[tk] || '';
    note.addEventListener('change', () => {
      const v = note.value.trim();
      if (v) db.notes[tk] = v;
      else delete db.notes[tk];
      save();
    });
    extra.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Observación' }), note]));
    row.appendChild(extra);
    frag.appendChild(row);
  }

  if (!athletes.length) frag.appendChild(el('div', { class: 'criterion', text: 'No hay nadadoras activas en este grupo.' }));
  return frag;
}

function screenAtHome() {
  const frag = document.createDocumentFragment();
  frag.appendChild(el('h2', { text: 'Análisis en casa' }));
  frag.appendChild(el('p', { class: 'note', text: 'Lo que sale del vídeo, de la foto o de My Jump Lab. Pásalo el mismo día: My Jump Lab no guarda tu serie de forma recuperable.' }));

  const pending = pendingAtHome();
  if (!pending.length) {
    frag.appendChild(el('div', { class: 'criterion', text: 'Nada pendiente. Aquí aparecerán las alturas de salto, los grados del puente y los ángulos en cuanto captures algo en sesión.' }));
    return frag;
  }

  let currentKey = '';
  for (const p of pending) {
    const k = `${p.date}|${p.test.id}`;
    if (k !== currentKey) {
      currentKey = k;
      frag.appendChild(el('h3', { text: `${p.date} · ${p.test.label}` }));
    }
    const row = el('div', { class: 'athlete' });
    row.appendChild(el('div', { class: 'who' }, [
      el('span', { class: 'code', text: p.athlete }),
      el('button', {
        class: 'pill', type: 'button', text: 'no aplica',
        onclick: () => {
          db.skipped[key(p.date, p.athlete, p.test.id, p.metric.csv)] = true;
          save();
          render();
        },
      }),
    ]));
    row.appendChild(el('div', { class: 'fields' }, [fieldFor(p.metric, p.date, p.athlete, p.group, p.test)]));
    frag.appendChild(row);
  }
  return frag;
}

function screenRoster() {
  const frag = document.createDocumentFragment();
  frag.appendChild(el('h2', { text: 'Nadadoras' }));
  frag.appendChild(el('p', { class: 'note', text: 'Solo códigos. El mapa código ↔ nombre vive en papel, en tu carpeta, nunca aquí. Cada grupo tiene su rango reservado —Alevín 01-12, Infantil 13-22, Junior 23-28— igual que las hojas impresas, y un código no se reutiliza jamás.' }));

  const group = GROUPS.find((g) => g.id === ui.group);
  frag.appendChild(el('div', { class: 'criterion', text: `${group.label} usa de ATL-${String(group.start).padStart(2, '0')} a ATL-${String(group.start + group.size - 1).padStart(2, '0')}. Asígnalos en el pase de lista, todos de golpe y antes de medir nada.` }));
  const addOne = () => db.athletes.push({ code: claimCode(ui.group), group: ui.group, active: true });

  const add = el('button', { class: 'btn primary', type: 'button', text: `+ Añadir nadadora a ${group.label}` });
  add.addEventListener('click', () => {
    addOne();
    save();
    render();
  });
  frag.appendChild(add);

  const missing = group.size - activeAthletes(ui.group).length;
  if (missing > 0) {
    const bulk = el('button', { class: 'btn', type: 'button', text: `+ Completar el grupo: crear ${missing} códigos de golpe` });
    bulk.addEventListener('click', () => {
      for (let i = 0; i < missing; i++) addOne();
      save();
      render();
    });
    frag.appendChild(bulk);
  }

  for (const g of GROUPS) {
    const list = db.athletes.filter((a) => a.group === g.id).sort((a, b) => a.code.localeCompare(b.code));
    frag.appendChild(el('h3', { text: `${g.label} — ${list.filter((a) => a.active !== false).length} activas de ${g.size} previstas` }));
    for (const a of list) {
      const card = el('div', { class: 'athlete' });
      const move = el('select');
      for (const gg of GROUPS) move.appendChild(el('option', { value: gg.id, text: gg.label, selected: gg.id === a.group }));
      move.addEventListener('change', () => {
        a.group = move.value;
        save();
        render();
      });
      const toggle = el('button', {
        class: 'pill' + (a.active !== false ? ' ok' : ''), type: 'button',
        text: a.active !== false ? 'activa' : 'de baja',
        onclick: () => {
          a.active = a.active === false;
          save();
          render();
        },
      });
      card.appendChild(el('div', { class: 'who' }, [el('span', { class: 'code', text: a.code }), toggle]));
      card.appendChild(el('div', { class: 'fields' }, [el('div', { class: 'field' }, [el('label', { text: 'Grupo' }), move])]));
      frag.appendChild(card);
    }
  }

  const ev = el('input', { type: 'text', value: db.evaluator || 'DJ' });
  ev.addEventListener('change', () => {
    db.evaluator = ev.value.trim() || 'DJ';
    save();
  });
  frag.appendChild(el('h3', { text: 'Evaluador' }));
  frag.appendChild(el('div', { class: 'athlete' }, [el('div', { class: 'field' }, [el('label', { text: 'Iniciales que van a la columna evaluador' }), el('div', { class: 'inputline' }, [ev])])]));
  return frag;
}

function screenExport() {
  const frag = document.createDocumentFragment();
  const total = Object.keys(db.records).length;
  const pend = unexportedCount();
  frag.appendChild(el('h2', { text: 'Exportar' }));
  frag.appendChild(el('p', { class: 'note', text: `${total} mediciones guardadas · ${pend} sin exportar.` }));
  frag.appendChild(el('div', { class: 'criterion', text: 'Exporta al acabar cada sesión, sin excepción. El navegador del iPhone puede borrar los datos de una web que no se usa; el CSV en OneDrive no.' }));

  const csvBtn = el('button', { class: 'btn primary', type: 'button', text: '📤 Compartir CSV → Archivos / OneDrive' });
  csvBtn.addEventListener('click', async () => {
    const ok = await shareFile(CSV_NAME, buildCSV(), 'text/csv');
    if (ok) {
      db.lastExport = Date.now();
      save();
      render();
    }
  });
  frag.appendChild(csvBtn);

  const jsonBtn = el('button', { class: 'btn', type: 'button', text: '💾 Copia de seguridad completa (JSON)' });
  jsonBtn.addEventListener('click', () => shareFile(`backup-${todayISO()}.json`, JSON.stringify(db, null, 1), 'application/json'));
  frag.appendChild(jsonBtn);

  const restore = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  restore.addEventListener('change', async () => {
    const file = restore.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data.records !== 'object') throw new Error('formato');
      if (!confirm(`Restaurar ${Object.keys(data.records).length} mediciones. Se reemplaza todo lo que hay ahora. ¿Seguro?`)) return;
      Object.assign(db, blankDB(), data);
      save();
      render();
    } catch (err) {
      alert('Ese archivo no es una copia válida.');
    }
  });
  const restoreBtn = el('button', { class: 'btn ghost', type: 'button', text: '↩︎ Restaurar desde una copia', onclick: () => restore.click() });
  frag.appendChild(restoreBtn);
  frag.appendChild(restore);

  frag.appendChild(el('h3', { text: 'Vista previa' }));
  frag.appendChild(el('pre', { class: 'csv', text: buildCSV().split('\n').slice(0, 40).join('\n') || CSV_HEADER }));

  // Two taps plus a confirm, and it names what it is about to destroy. There was no way at all to
  // clear this app before 2026-08-11, which left the fake data of a rehearsal stuck on the phone.
  frag.appendChild(el('h3', { text: 'Empezar de cero' }));
  frag.appendChild(el('div', { class: 'criterion blocked', text: 'Borra las mediciones, las nadadoras y las notas de este teléfono. No hay deshacer: exporta antes si hay algo que quieras conservar.' }));
  const wipe = el('button', { class: 'btn ghost', type: 'button', text: '🗑 Borrar todo' });
  let armed = false;
  wipe.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      wipe.textContent = `Pulsa otra vez para borrar ${total} mediciones y ${db.athletes.length} nadadoras`;
      wipe.className = 'btn primary';
      return;
    }
    if (!confirm(`Se borran ${total} mediciones y ${db.athletes.length} nadadoras. ¿Seguro?`)) {
      armed = false;
      render();
      return;
    }
    Object.assign(db, blankDB());
    localStorage.removeItem(STORE_KEY);
    save();
    go({ tab: 'roster', blockId: null, testId: null });
  });
  frag.appendChild(wipe);
  return frag;
}

/* ----------------------------------------------------------------- render */

function render() {
  stopWatch();
  $group.innerHTML = '';
  for (const g of GROUPS) $group.appendChild(el('option', { value: g.id, text: g.label, selected: g.id === ui.group }));
  $date.value = ui.date;

  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === ui.tab);
  const pending = pendingAtHome().length;
  $badge.hidden = pending === 0;
  $badge.textContent = pending;

  $banner.innerHTML = '';
  const pend = unexportedCount();
  if (pend > 0) $banner.appendChild(el('div', { class: 'banner warn', text: `${pend} mediciones sin exportar. Comparte el CSV al acabar la sesión.` }));
  const noApp = missingApparatus();
  if (noApp.length) {
    const where = noApp.map((k) => k.split('|').reverse().join(' ')).join(', ');
    $banner.appendChild(el('div', { class: 'banner warn', text: `Falta declarar el aparato de colgada en: ${where}. Sin él, esas filas salen con la columna instrumento vacía.` }));
  }

  $view.innerHTML = '';
  if (ui.tab === 'session') {
    const blocks = blocksForGroup(ui.group);
    const block = blocks.find((b) => b.id === ui.blockId);
    if (!block) $view.appendChild(screenBlocks());
    else if (ui.testId && block.tests.includes(ui.testId)) $view.appendChild(screenTestDetail(block, TEST_BY_ID[ui.testId]));
    else $view.appendChild(screenTests(block));
  } else if (ui.tab === 'athome') $view.appendChild(screenAtHome());
  else if (ui.tab === 'roster') $view.appendChild(screenRoster());
  else $view.appendChild(screenExport());
  window.scrollTo(0, 0);
}

document.getElementById('clockFace').addEventListener('click', roomClockToggle);
document.getElementById('clockZero').addEventListener('click', roomClockZero);
document.getElementById('clockExit').addEventListener('click', roomClockClose);
// iOS drops the wake lock when the app goes to the background; take it back.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  if (!document.getElementById('clock').classList.contains('on') || roomClock.lock) return;
  try { roomClock.lock = await navigator.wakeLock.request('screen'); } catch (e) { roomClock.lock = null; }
});

$group.addEventListener('change', () => go({ group: $group.value, blockId: null, testId: null }));
$date.addEventListener('change', () => go({ date: $date.value || todayISO(), pinDate: $date.value !== todayISO() }));
for (const b of document.querySelectorAll('#tabs button')) {
  b.addEventListener('click', () => go({ tab: b.dataset.tab }));
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('sw', err));
}

render();
