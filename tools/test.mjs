/*
 * Runs the real app.js + catalog.js in Node against a stub DOM.
 *
 *   node tools/test.mjs [path/to/mediciones-2026-27.csv]
 *
 * With the CSV path given it also asserts that CSV_HEADER still matches the schema that owns it;
 * that file is private, so the check is skipped when the path is absent. This app has no build
 * step and no test framework on purpose — a stub DOM in one file is the whole harness.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

const DIR = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const SCHEMA = process.argv[2];

/* ---- the smallest DOM that app.js will accept ---- */
const makeNode = (tag = 'div') => {
  const n = {
    tagName: String(tag).toUpperCase(), children: [], attrs: {}, _class: '', _text: '',
    style: {}, dataset: {}, hidden: false, files: [],
    get className() { return this._class; }, set className(v) { this._class = v; },
    get textContent() { return this._text; }, set textContent(v) { this._text = v; },
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; },
    get classList() {
      return {
        toggle: (c, on) => { const s = new Set(n._class.split(' ').filter(Boolean)); on ? s.add(c) : s.delete(c); n._class = [...s].join(' '); },
        add: (c) => { const s = new Set(n._class.split(' ').filter(Boolean)); s.add(c); n._class = [...s].join(' '); },
        remove: (c) => { const s = new Set(n._class.split(' ').filter(Boolean)); s.delete(c); n._class = [...s].join(' '); },
      };
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { for (const c of cs) this.children.push(typeof c === 'string' ? { _text: c, children: [] } : c); },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    remove() {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(ev, fn) { (this._on ||= {})[ev] = fn; },
    click() { this._on?.click?.(); },
    querySelector() { return makeNode('label'); },
    querySelectorAll() { return []; },
    scrollIntoView() {},
  };
  return n;
};

const store = new Map();
const byId = {};
for (const id of ['view', 'group', 'date', 'tabs', 'badge', 'banner']) byId[id] = makeNode(id === 'group' || id === 'date' ? 'select' : 'div');

const docListeners = {};
const doc = {
  createElement: makeNode,
  createDocumentFragment: () => makeNode('fragment'),
  getElementById: (id) => byId[id] || makeNode(),
  querySelector: () => makeNode(),
  querySelectorAll: () => [],
  body: makeNode('body'),
  visibilityState: 'visible',
  addEventListener: (ev, fn) => { docListeners[ev] = fn; },
};

const sandbox = {
  document: doc,
  window: { scrollTo() {}, matchMedia: () => ({ matches: false }) },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  },
  navigator: { serviceWorker: undefined },
  location: { protocol: 'file:' },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, parseInt, parseFloat, isNaN, String, Number, Object, Array, Map, Set, alert: () => {}, confirm: () => true,
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  File: class {},
};
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
for (const f of ['catalog.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f });
}

/* ---- helpers into the app's own scope ---- */
const ev = (expr) => vm.runInContext(expr, ctx);

let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FALLA'}  ${name}`);
  if (!ok) console.log(`        esperado ${JSON.stringify(want)}\n        obtenido ${JSON.stringify(got)}`);
};

console.log('== 1. la cabecera tiene 11 columnas y instrumento en su sitio ==');
const header = ev('CSV_HEADER');
check('11 columnas', header.split(',').length, 11);
check('instrumento entre intentos y evaluador', header.split(',').slice(7, 10), ['intentos', 'instrumento', 'evaluador']);
if (SCHEMA) {
  check('coincide con el esquema del frente', header, fs.readFileSync(SCHEMA, 'utf8').split('\n')[0].trim());
} else {
  console.log('....  sin comprobar contra el esquema real: pasa la ruta del .csv como argumento');
}

console.log('\n== 2. rangos de codigo por grupo, en cualquier orden de registro ==');
// Junior first, on purpose: that was the desync risk.
ev(`db.athletes.length = 0; db.codesUsed = [];
for (const g of ['junior','alevin','infantil']) {
  const n = GROUPS.find(x=>x.id===g).size;
  for (let i=0;i<n;i++) db.athletes.push({code: claimCode(g), group: g, active: true});
}`);
const codes = (g) => ev(`db.athletes.filter(a=>a.group==='${g}').map(a=>a.code)`);
check('Alevin 01-12', codes('alevin'), Array.from({ length: 12 }, (_, i) => `ATL-${String(i + 1).padStart(2, '0')}`));
check('Infantil 13-22', codes('infantil'), Array.from({ length: 10 }, (_, i) => `ATL-${i + 13}`));
check('Junior 23-28', codes('junior'), Array.from({ length: 6 }, (_, i) => `ATL-${i + 23}`));

console.log('\n== 3. desbordes: 11a infantil y codigo de una baja ==');
check('la 11a de Infantil no roba el 23 de Junior', ev(`nextCode('infantil')`), 'ATL-29');
check('preguntar por un codigo no lo quema', ev(`nextCode('infantil')`), 'ATL-29');
ev(`db.athletes = db.athletes.filter(a=>a.code!=='ATL-05')`);
check('un codigo liberado no se reutiliza', ev(`nextCode('alevin')`), 'ATL-29');
// A backup restored over a fresh install: athletes present, graveyard absent.
ev(`db.codesUsed = []; db.athletes = [{code:'ATL-07',group:'alevin',active:false}];`);
check('una copia antigua sin cementerio respeta los codigos que ve', ev(`nextCode('alevin')`), 'ATL-01');
check('y no reparte el 07 que ya existe', ev(`db.athletes.some(a=>a.code===nextCode('alevin'))`), false);

console.log('\n== 4. el aparato viaja a la columna instrumento ==');
ev(`db.athletes = [{code:'ATL-01',group:'alevin',active:true}];
setVal('2026-09-22','ATL-01','alevin','elevaciones_colgada','reps',8);
setVal('2026-09-22','ATL-01','alevin','hollow','tiempo',12.4);`);
let rows = ev('buildCSV()').trim().split('\n');
const col = (line, i) => line.split(',')[i];
check('sin declarar aparato, instrumento va vacio', rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['']);
check('la app avisa de que falta', ev('missingApparatus()'), ['2026-09-22|alevin']);

ev(`db.apparatus[apparatusKey('2026-09-22','alevin')] = 'espaldera'`);
rows = ev('buildCSV()').trim().split('\n');
check('declarado, sale espaldera', rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['espaldera']);
check('una prueba sin aparato lo deja en blanco', rows.filter((l) => l.includes('hollow')).map((l) => col(l, 8)), ['']);
check('ya no avisa', ev('missingApparatus()'), []);
check('cada fila tiene 11 campos', [...new Set(rows.map((l) => l.split(',').length))], [11]);
check('evaluador sigue en su columna', rows.filter((l) => l.includes('hollow')).map((l) => col(l, 9)), ['DJ']);

console.log('\n== 5. el aparato es de la sesion, no de la nadadora ==');
ev(`for (const c of ['ATL-02','ATL-03']) { db.athletes.push({code:c,group:'alevin',active:true}); setVal('2026-09-22',c,'alevin','elevaciones_colgada','reps',5); }`);
rows = ev('buildCSV()').trim().split('\n');
check('las tres filas heredan el aparato de un solo toque',
  rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['espaldera', 'espaldera', 'espaldera']);
ev(`setVal('2026-10-20','ATL-01','alevin','elevaciones_colgada','reps',11)`);
check('otra fecha vuelve a pedir el aparato', ev('missingApparatus()'), ['2026-10-20|alevin']);

console.log('\n== 6. borrar todo deja la app en cero ==');
ev(`db.lastExport = 1; Object.assign(db, blankDB()); localStorage.removeItem(STORE_KEY);`);
check('sin mediciones', ev('Object.keys(db.records).length'), 0);
check('sin nadadoras', ev('db.athletes.length'), 0);
check('sin aparatos', ev('Object.keys(db.apparatus).length'), 0);
check('evaluador vuelve al defecto', ev('db.evaluator'), 'DJ');
check('el CSV queda solo con la cabecera', ev('buildCSV()').trim(), header);
check('el almacenamiento del telefono queda limpio', store.has(ev('STORE_KEY')), false);

console.log('\n== 6 bis. las pantallas se pintan sin reventar ==');
// The data tests never executed a single render path, and the apparatus picker is new UI.
const texts = (node, out = []) => {
  if (node._text) out.push(node._text);
  if (node._html) out.push(String(node._html).replace(/<[^>]*>/g, ''));
  for (const c of node.children || []) texts(c, out);
  return out;
};
ev(`db.athletes = []; db.codesUsed = [];
for (let i=0;i<3;i++) db.athletes.push({code: claimCode('alevin'), group:'alevin', active:true});
setVal('2026-09-22','ATL-01','alevin','elevaciones_colgada','reps',8);`);

const paint = (expr) => { const n = ev(expr); return texts(n).join(' | '); };
let screen = paint(`screenTestDetail({label:'x',tests:['elevaciones_colgada']}, TEST_BY_ID['elevaciones_colgada'])`);
check('la prueba de colgada avisa de que falta el aparato', /Di en qué aparato se mide/.test(screen), true);
check('y ofrece los dos aparatos', ['espaldera', 'barra'].every((o) => screen.includes(o)), true);

ev(`db.apparatus[apparatusKey(ui.date,'alevin')] = 'barra'`);
screen = paint(`screenTestDetail({label:'x',tests:['elevaciones_colgada']}, TEST_BY_ID['elevaciones_colgada'])`);
check('declarado, lo muestra en vez de avisar', /Aparato: barra/.test(screen) && !/Di en qué aparato/.test(screen), true);

screen = paint(`screenTestDetail({label:'x',tests:['hollow']}, TEST_BY_ID['hollow'])`);
check('una prueba sin aparato no pinta el selector', /Aparato:|Di en qué aparato/.test(screen), false);

screen = paint('screenRoster()');
check('el registro dice el rango del grupo', /ATL-01 a ATL-12/.test(screen), true);
screen = paint('screenExport()');
check('exportar ofrece borrar todo', /Borrar todo/.test(screen), true);
ev(`go({tab:'roster'}); go({tab:'export'}); go({tab:'athome'}); go({tab:'session'})`);
check('las cuatro pestañas renderizan', true, true);

console.log('\n== 6 ter. varios cronometros a la vez (2026-09-15) ==');
// Habia uno solo: arrancar el segundo paraba el primero Y le escribia su valor en la casilla,
// asi que dos aguantes simultaneos eran imposibles. Con doce ninas eso es media sesion.
ev(`stopAllWatches();
globalThis.__t = { calls: [] };
globalThis.mkField = (name) => {
  const line = numberField({ type: 'seconds' }, '', (v) => __t.calls.push([name, v]));
  return { btn: line.children[0], input: line.children[1] };
};
globalThis.F1 = mkField('F1'); globalThis.F2 = mkField('F2'); globalThis.F3 = mkField('F3');
F1.btn.click(); F2.btn.click(); F3.btn.click();`);

check('tres corriendo a la vez', ev('watches.size'), 3);
check('los tres botones muestran parar', ev('[F1,F2,F3].map(f=>f.btn.textContent)'), ['⏹', '⏹', '⏹']);
check('ninguno ha anotado nada todavia', ev('__t.calls'), []);
check('un solo ticker para todos', ev('watchTicker !== null'), true);

// Tiempos conocidos, escritos en el reloj interno de cada uno.
ev(`watches.get(F1.btn).t0 = Date.now() - 12400;
watches.get(F2.btn).t0 = Date.now() - 35000;
watches.get(F3.btn).t0 = Date.now() - 8100;`);
ev('F2.btn.click()'); // la segunda rompe la posicion antes que nadie

check('parar uno deja los otros dos corriendo', ev('watches.size'), 2);
check('y solo anota el suyo', ev('__t.calls.map((c) => c[0])'), ['F2']);
check('con su tiempo, no el de otro', ev('Math.abs(__t.calls[0][1] - 35) < 0.15'), true);
check('el que para vuelve a ⏱', ev('F2.btn.textContent'), '⏱');
check('y pierde la clase running', ev('F2.btn.className.includes("running")'), false);
check('los otros dos siguen en ⏹', ev('[F1,F3].map((f) => f.btn.textContent)'), ['⏹', '⏹']);
// Lo que rompia antes: el valor de uno aterrizaba en la casilla de otro.
ev('paintWatches()');
check('cada casilla pinta su propio tiempo, no el del vecino',
  ev('[Math.abs(F1.input.value - 12.4) < 0.15, Math.abs(F3.input.value - 8.1) < 0.15]'), [true, true]);
check('y la del que paro conserva el suyo', ev('Math.abs(F2.input.value - 35) < 0.15'), true);
check('el ticker sigue vivo mientras quede alguno', ev('watchTicker !== null'), true);

// Lo que pasa al repintar: render() para todos y anota lo que llevaran, porque un cronometro
// huerfano escribiria en una casilla que ya no esta en pantalla.
ev('stopAllWatches()');
check('parar todos anota los dos que quedaban', ev('__t.calls.map((c) => c[0])'), ['F2', 'F1', 'F3']);
check('cada uno con su propio tiempo', ev('[Math.abs(__t.calls[1][1]-12.4)<0.15, Math.abs(__t.calls[2][1]-8.1)<0.15]'), [true, true]);
check('no queda ninguno corriendo', ev('watches.size'), 0);
check('y el ticker se apaga', ev('watchTicker'), null);

// Tocar dos veces el mismo boton es arrancar y parar, no arrancar dos veces.
ev(`__t.calls = []; F1.btn.click(); F1.btn.click();`);
check('doble toque en el mismo boton arranca y para', ev('[watches.size, __t.calls.length]'), [0, 1]);

console.log('\n== 7. el aviso rojo obsoleto de P1 ya no existe ==');
check('elevaciones_colgada sin blocked', ev(`!!TEST_BY_ID['elevaciones_colgada'].blocked`), false);
check('y con aparatos declarados', ev(`TEST_BY_ID['elevaciones_colgada'].apparatus`), ['espaldera', 'barra']);

console.log('\n== 8. todo archivo al que apunta la app existe en disco ==');
// icon.svg estuvo referenciado y ausente del 2026-08-07 al 2026-08-21. cache.addAll rechaza
// entero ante un solo 404, asi que el service worker nunca llego a instalarse y la app dejo
// de funcionar sin red sin avisar de nada. Esta comprobacion es lo que lo habria cazado.
const swSrc = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8');
const listed = (name) => {
  const m = swSrc.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
};
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8'));
const referenced = new Set([
  ...listed('CORE'), ...listed('EXTRAS'),
  ...[...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]),
  ...manifest.icons.map((i) => i.src),
].filter((f) => f !== './'));
const missing = [...referenced].filter((f) => !fs.existsSync(path.join(DIR, f)));
check('ningun archivo referenciado falta', missing, []);
check('el apple-touch-icon es PNG', /rel="apple-touch-icon" href="[^"]+\.png"/.test(html), true);

console.log(fails ? `\n${fails} COMPROBACIONES FALLIDAS` : '\ntodas las comprobaciones pasan');
process.exit(fails ? 1 : 0);
