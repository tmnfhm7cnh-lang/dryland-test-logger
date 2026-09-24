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

// Both document and window can carry more than one listener per event in a real browser —
// app.js now registers two separate 'visibilitychange' handlers (wake lock + the flush-on-hide
// of §1 del LOTE 1), so the stub has to fan out to all of them, not keep only the last one.
const docListeners = {};
const winListeners = {};
const fireDoc = (evName) => (docListeners[evName] || []).forEach((fn) => fn());
const fireWin = (evName) => (winListeners[evName] || []).forEach((fn) => fn());

const doc = {
  createElement: makeNode,
  createDocumentFragment: () => makeNode('fragment'),
  getElementById: (id) => byId[id] || makeNode(),
  querySelector: () => makeNode(),
  querySelectorAll: () => [],
  body: makeNode('body'),
  visibilityState: 'visible',
  addEventListener: (ev, fn) => { (docListeners[ev] ||= []).push(fn); },
};

const sandbox = {
  document: doc,
  window: {
    scrollTo() {}, matchMedia: () => ({ matches: false }),
    addEventListener: (ev, fn) => { (winListeners[ev] ||= []).push(fn); },
  },
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

console.log('\n== 4. el aparato viaja a la columna instrumento, congelado al escribir (2026-09-24 — antes se leia en vivo al exportar y reescribia el pasado; decision de Daniel, §5 del LOTE 1) ==');
ev(`db.athletes = [{code:'ATL-01',group:'alevin',active:true}];
setVal('2026-09-22','ATL-01','alevin','elevaciones_colgada','reps',8);
setVal('2026-09-22','ATL-01','alevin','hollow','tiempo',12.4);`);
let rows = ev('buildCSV()').trim().split('\n');
const col = (line, i) => line.split(',')[i];
check('sin declarar aparato, instrumento va vacio', rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['']);
check('la app avisa de que falta', ev('missingApparatus()'), ['2026-09-22|alevin']);

ev(`db.apparatus[apparatusKey('2026-09-22','alevin')] = 'espaldera'`);
rows = ev('buildCSV()').trim().split('\n');
check('declarar el aparato despues NO reescribe lo ya anotado: sigue en blanco', rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['']);
check('ya no avisa: el aparato de la sesion ya esta declarado para lo que se escriba de aqui en adelante', ev('missingApparatus()'), []);

ev(`setVal('2026-09-22','ATL-01','alevin','elevaciones_colgada','tiempo_carpa',5);`);
rows = ev('buildCSV()').trim().split('\n');
check('lo que se escribe despues de declarar si lleva el aparato',
  rows.filter((l) => l.includes('elevaciones_colgada') && l.includes('tiempo_carpa')).map((l) => col(l, 8)), ['espaldera']);
check('una prueba sin aparato lo deja en blanco', rows.filter((l) => l.includes('hollow')).map((l) => col(l, 8)), ['']);
check('cada fila tiene 11 campos', [...new Set(rows.map((l) => l.split(',').length))], [11]);
check('evaluador sigue en su columna', rows.filter((l) => l.includes('hollow')).map((l) => col(l, 9)), ['DJ']);

console.log('\n== 4 bis. una fila de antes del congelado (sin r.ap) se sigue leyendo en vivo, no se rompe ==');
// Misma fecha/grupo que ya tiene 'espaldera' declarado, para no disparar missingApparatus() —
// simula una fila real escrita con el codigo de antes de este LOTE, que nunca tuvo r.ap.
ev(`db.records['2026-09-22|ATL-01|elevaciones_colgada|angulo_maximo'] = {d:'2026-09-22', a:'ATL-01', g:'alevin', t:'elevaciones_colgada', m:'angulo_maximo', v:150, at: Date.now()};`);
check('sin .ap, se cae al valor en vivo (compatibilidad con datos ya escritos)',
  ev('buildCSV()').trim().split('\n').filter((l) => l.includes('angulo_maximo')).map((l) => col(l, 8)), ['espaldera']);
ev(`delete db.records['2026-09-22|ATL-01|elevaciones_colgada|angulo_maximo'];`); // no contaminar las siguientes secciones

console.log('\n== 5. el aparato es de la sesion, no de la nadadora ==');
// El 'reps' de ATL-01 se escribio en la seccion 4 antes de declarar el aparato y quedo
// congelado en blanco (§5 del LOTE 1) — se corrige aqui, ya con el aparato declarado, igual
// que haria Daniel al releer la hoja; ATL-02 y ATL-03 se escriben ya con el aparato puesto.
ev(`for (const c of ['ATL-01','ATL-02','ATL-03']) { if (c!=='ATL-01') db.athletes.push({code:c,group:'alevin',active:true}); setVal('2026-09-22',c,'alevin','elevaciones_colgada','reps',5); }`);
rows = ev('buildCSV()').trim().split('\n');
check('las tres filas heredan el aparato de un solo toque',
  rows.filter((l) => l.includes('elevaciones_colgada')).map((l) => col(l, 8)), ['espaldera', 'espaldera', 'espaldera', 'espaldera']);
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
// Same trick as texts(): the fragments screenX() returns are plain host objects (Array/Object
// are shared between this realm and the vm sandbox), so a plain Node-side tree search works
// on them directly — no need to locate elements from inside an ev() string.
const findNode = (node, pred) => {
  if (!node) return null;
  if (pred(node)) return node;
  for (const c of node.children || []) {
    const found = findNode(c, pred);
    if (found) return found;
  }
  return null;
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
ev(`globalThis.__t = { calls: [] };
globalThis.mkField = (name, cellKey) => {
  const line = numberField({ type: 'seconds' }, '', (v) => __t.calls.push([name, v]), cellKey);
  return { btn: line.children[0], input: line.children[1] };
};
globalThis.F1 = mkField('F1', 'k1'); globalThis.F2 = mkField('F2', 'k2'); globalThis.F3 = mkField('F3', 'k3');
F1.btn.click(); F2.btn.click(); F3.btn.click();`);

check('tres corriendo a la vez', ev('watches.size'), 3);
check('los tres botones muestran parar', ev('[F1,F2,F3].map(f=>f.btn.textContent)'), ['⏹', '⏹', '⏹']);
check('ninguno ha anotado nada todavia', ev('__t.calls'), []);
check('un solo ticker para todos', ev('watchTicker !== null'), true);

// Tiempos conocidos, escritos en el reloj interno de cada uno (en las dos copias del
// estado: la atada al boton y la que sobrevive al repintado).
ev(`for (const [f, ms, k] of [[F1, 12400, 'k1'], [F2, 35000, 'k2'], [F3, 8100, 'k3']]) {
  const t0 = Date.now() - ms;
  watches.get(f.btn).t0 = t0;
  runningWatches.get(k).t0 = t0;
}`);
ev('F2.btn.click()'); // la segunda rompe la posicion antes que nadie, y ha pasado de sobra de 400 ms

check('parar uno deja los otros dos corriendo', ev('watches.size'), 2);
check('y solo anota el suyo', ev('__t.calls.map((c) => c[0])'), ['F2']);
check('con su tiempo, no el de otro', ev('Math.abs(__t.calls[0][1] - 35) < 0.15'), true);
check('el que para vuelve a ⏱', ev('F2.btn.textContent'), '⏱');
check('y pierde la clase running', ev('F2.btn.className.includes("running")'), false);
check('los otros dos siguen en ⏹', ev('[F1,F3].map((f) => f.btn.textContent)'), ['⏹', '⏹']);
check('su cronometro real ya no esta entre los vivos', ev('runningWatches.has("k2")'), false);
// Lo que rompia antes: el valor de uno aterrizaba en la casilla de otro.
ev('paintWatches()');
check('cada casilla pinta su propio tiempo, no el del vecino',
  ev('[Math.abs(F1.input.value - 12.4) < 0.15, Math.abs(F3.input.value - 8.1) < 0.15]'), [true, true]);
check('y la del que paro conserva el suyo', ev('Math.abs(F2.input.value - 35) < 0.15'), true);
check('el ticker sigue vivo mientras quede alguno', ev('watchTicker !== null'), true);

console.log('\n== 6 quater. un repintado suspende sin anotar, y reanuda al volver (2026-09-23) ==');
// Esto es lo que hasta ahora fabricaba tiempos falsos: cualquier repintado (cambiar de
// pestana, un RPE, marcar hecho, elegir aparato...) llama a esto mismo que render(), y
// antes eso paraba-y-anotaba cualquier cronometro corriendo. Ahora solo debe soltar el
// nodo del boton: el cronometro real (F1 y F3, todavia vivos) no debe tocarse.
ev('__t.calls = []; detachWatches();');
check('el repintado no anota nada', ev('__t.calls'), []);
check('los cronometros reales siguen vivos', ev('[runningWatches.has("k1"), runningWatches.has("k3")]'), [true, true]);
check('pero ya no hay ningun boton atado', ev('watches.size'), 0);

// Se repinta la misma casilla (k1): el boton nuevo tiene que nacer ya corriendo, con el
// tiempo acumulado del original, no desde cero.
ev(`globalThis.F1b = mkField('F1-repintado', 'k1');`);
check('el boton nuevo nace corriendo', ev('F1b.btn.textContent'), '⏹');
check('con el tiempo acumulado (~12,4 s), no desde cero', ev('Math.abs(F1b.input.value - 12.4) < 0.15'), true);
check('y queda atado en watches', ev('watches.has(F1b.btn)'), true);

ev(`watches.get(F1b.btn).t0 -= 1000; runningWatches.get('k1').t0 = watches.get(F1b.btn).t0;
F1b.btn.click();`);
check('parar tras reanudar anota, con el nombre del campo repintado', ev('__t.calls.map((c) => c[0])'), ['F1-repintado']);
check('y con el tiempo desde el arranque original (12,4 + 1 = 13,4 s), no 1 s', ev('Math.abs(__t.calls[0][1] - 13.4) < 0.2'), true);

// Una casilla que no se vuelve a pintar (p. ej. se cambio de prueba) sigue corriendo en
// segundo plano, sin anotar nada, hasta que alguien vuelva a esa pantalla o la pare.
check('k3 sigue corriendo sin nadie pintandola', ev('runningWatches.has("k3")'), true);
check('y nada se ha anotado por ella', ev('__t.calls.some((c) => c[0] === "F3")'), false);
ev(`globalThis.F3b = mkField('F3-repintado', 'k3');
watches.get(F3b.btn).t0 -= 1000; runningWatches.get('k3').t0 = watches.get(F3b.btn).t0;
F3b.btn.click();`);
check('y cuando por fin se para, anota el tiempo real acumulado (~9,1 s)', ev('Math.abs(__t.calls.find(c=>c[0]==="F3-repintado")[1] - 9.1) < 0.2'), true);
check('no queda ningun cronometro corriendo', ev('runningWatches.size'), 0);
check('ni ningun boton atado', ev('watches.size'), 0);
check('y el ticker se apaga', ev('watchTicker'), null);

console.log('\n== 6 quinquies. doble toque no anota ~0,0 s encima del valor bueno (2026-09-23) ==');
ev(`__t.calls = []; globalThis.F4 = mkField('F4', 'k4'); F4.btn.click(); F4.btn.click();`); // el segundo toque llega casi al instante
check('el doble toque no para el cronometro', ev('watches.has(F4.btn)'), true);
check('sigue mostrando parar', ev('F4.btn.textContent'), '⏹');
check('no anota nada', ev('__t.calls'), []);
ev(`watches.get(F4.btn).t0 -= 1000; runningWatches.get('k4').t0 = watches.get(F4.btn).t0;
F4.btn.click();`); // esta vez si ha pasado tiempo de verdad
check('pasado el tiempo, el toque de parar si anota', ev('__t.calls.map((c) => c[0])'), ['F4']);
check('con el tiempo real, no ~0', ev('Math.abs(__t.calls[0][1] - 1.0) < 0.2'), true);

console.log('\n== 6 sexies. abrir el reloj de sala ya no para los cronometros (2026-09-23) ==');
ev(`__t.calls = []; globalThis.F5 = mkField('F5', 'k5'); F5.btn.click();`);
ev('roomClockOpen()');
check('el cronometro sigue corriendo tras abrir el reloj de sala', ev('watches.has(F5.btn)'), true);
check('nada anotado', ev('__t.calls'), []);

console.log('\n== 6 septies. coma decimal no vacia el campo ni borra un dato guardado (2026-09-23) ==');
ev(`globalThis.__c = { last: undefined };
const line = numberField({ type: 'cm' }, 37, (v) => { __c.last = v; }, 'ck-cm');
globalThis.CM = { input: line.children[1] };`);
check('el campo numérico es type=text, no type=number', ev('CM.input.attrs.type'), 'text');
check('el valor inicial se pasa igual', ev('CM.input.attrs.value'), 37);

ev(`CM.input.value = '12,5'; CM.input._on.change();`);
check('la coma se interpreta como decimal (12,5 -> 13 cm redondeado)', ev('__c.last'), 13);
check('sin marcar el campo', ev('CM.input.className.includes("invalid")'), false);

ev(`__c.last = undefined; CM.input.value = 'abc'; CM.input._on.change();`);
check('una entrada no interpretable no llama a commit (no borra lo guardado)', ev('__c.last'), undefined);
check('el campo se marca en rojo', ev('CM.input.className.includes("invalid")'), true);

ev(`CM.input.value = ''; CM.input._on.change();`);
check('vaciar el campo a propósito sí borra (es la acción explícita del usuario)', ev('__c.last'), '');

console.log('\n== 6 octies. rangos de validez por tipo de metrica (2026-09-24) ==');
ev(`globalThis.__r = { last: undefined };
const lineOk = numberField({ type: 'cm' }, '', (v) => { __r.last = v; }, 'ck-r1');
globalThis.RCM = { input: lineOk.children[1] };
RCM.input.value = '60'; RCM.input._on.change();`);
check('60 cm esta dentro del rango de cm, sin aviso', ev('RCM.input.className.includes("outrange")'), false);

ev(`__r.last = undefined; RCM.input.value = '999'; RCM.input._on.change();`);
check('999 cm (p.ej. un tiempo tecleado donde va un largo) se acepta igual — aviso, no bloqueo', ev('__r.last'), 999);
check('pero se marca fuera de rango', ev('RCM.input.className.includes("outrange")'), true);

ev(`globalThis.__r2 = { last: undefined };
const lineSec = numberField({ type: 'seconds' }, '', (v) => { __r2.last = v; }, 'ck-r2');
globalThis.RSEC = { btn: lineSec.children[0], input: lineSec.children[1] };
RSEC.btn.click();`);
ev(`watches.get(RSEC.btn).t0 -= 700 * 1000; runningWatches.get('ck-r2').t0 = watches.get(RSEC.btn).t0;
RSEC.btn.click();`);
check('un aguante de mas de 600 s (fuera del rango del tipo seconds) se anota igual', ev('Math.abs(__r2.last - 700) < 1'), true);
check('y el campo queda marcado fuera de rango', ev('RSEC.input.className.includes("outrange")'), true);

ev(`globalThis.__r3 = { last: undefined };
const lineOverride = numberField({ type: 'cm', min: 0, max: 15 }, '', (v) => { __r3.last = v; }, 'ck-r3');
globalThis.ROV = { input: lineOverride.children[1] };
ROV.input.value = '50'; ROV.input._on.change();`);
check('un min/max propio de la metrica se acepta igual (aviso, no bloqueo)', ev('__r3.last'), 50);
check('50 supera el maximo de esta metrica aunque entre en el rango general de cm', ev('ROV.input.className.includes("outrange")'), true);

console.log('\n== 6 nonies. borrar todo no vacia el cementerio de codigos (2026-09-24) ==');
ev(`db.athletes = []; db.codesUsed = [];
for (let i=0;i<3;i++) db.athletes.push({code: claimCode('alevin'), group:'alevin', active:true});
db.athletes[1].active = false;`); // una baja: su numero tiene que morir igual de quemado
const frag6nonies = ev('screenExport()');
const wipeBtn = findNode(frag6nonies, (n) => n.tagName === 'BUTTON' && n._text === '🗑 Borrar todo');
wipeBtn.click(); // arma
wipeBtn.click(); // confirm() del stub siempre da true
check('borrado, sin nadadoras', ev('db.athletes.length'), 0);
check('pero el cementerio conserva los tres numeros usados, bajas incluidas', ev('[...db.codesUsed].sort((a,b)=>a-b)'), [1, 2, 3]);
check('y no se reparten de nuevo', ev(`nextCode('alevin')`), 'ATL-04');

console.log('\n== 6 decies. una prueba renombrada no desaparece del csv (2026-09-24) ==');
ev(`db.records = {}; db.notes = {}; db.attempts = {};
db.athletes = [{code:'ATL-01', group:'alevin', active:true}];
setVal('2026-09-24','ATL-01','alevin','hollow','tiempo',20);
db.records['2026-09-24|ATL-01|test_borrado|tiempo'] = {d:'2026-09-24', a:'ATL-01', g:'alevin', t:'test_borrado', m:'tiempo', v:9.9, at: Date.now()};`);
check('la huerfana se detecta', ev('orphanRecords().length'), 1);
const csvRows6decies = ev('buildCSV()').trim().split('\n');
check('la fila huerfana sale con los ids crudos, no desaparece',
  csvRows6decies.some((l) => l.startsWith('2026-09-24,ATL-01,alevin,test_borrado,tiempo,9.9')), true);
check('cada fila del csv, huerfana incluida, tiene 11 campos', [...new Set(csvRows6decies.map((l) => l.split(',').length))], [11]);
check('exportar avisa del numero de filas huerfanas antes de compartir',
  /1 fila.*test_borrado/.test(paint('screenExport()')), true);

console.log('\n== 6 undecies. una correccion despues de exportar rearma el aviso de exportar (2026-09-24) ==');
// Reloj falso y estrictamente creciente: dos escrituras separadas por menos de 1 ms real
// (perfectamente posible entre dos llamadas seguidas a ev()) no deben poder empatar y dar
// un falso "no hay cambios" en la comprobacion — ver §6 del LOTE 1.
ev(`globalThis.__realNow = Date.now; let __fake = 1000; Date.now = () => ++__fake;`);
ev(`db.athletes = [{code:'ATL-01',group:'alevin',active:true}]; db.notes = {}; db.attempts = {}; db.apparatus = {};
setVal('2026-09-24','ATL-01','alevin','hollow','tiempo',20);
db.lastExport = db.lastWrite;`); // se acaba de exportar, justo despues del ultimo escrito real
check('recien exportado, sin cambios pendientes', ev('hasUnexportedChanges()'), false);

let row6undecies = ev(`screenTestDetail({label:'x',tests:['hollow']}, TEST_BY_ID['hollow'])`);
let noteBox = findNode(row6undecies, (n) => n.tagName === 'TEXTAREA');
noteBox.value = 'aviso tardío';
noteBox._on.change();
check('escribir una observación, sin tocar ninguna medición, rearma el aviso', ev('hasUnexportedChanges()'), true);

ev(`db.lastExport = db.lastWrite;`);
let row6undecies2 = ev(`screenTestDetail({label:'x',tests:['elevaciones_colgada']}, TEST_BY_ID['elevaciones_colgada'])`);
let pill = findNode(row6undecies2, (n) => n.tagName === 'BUTTON' && n._text === 'espaldera');
pill.click();
check('declarar el aparato rearma el aviso', ev('hasUnexportedChanges()'), true);

ev(`db.lastExport = db.lastWrite;`);
let row6undecies3 = ev(`screenTestDetail({label:'x',tests:['hollow']}, TEST_BY_ID['hollow'])`);
let attemptsInput6u = findNode(row6undecies3, (n) => n.tagName === 'INPUT' && n.attrs.type === 'number');
attemptsInput6u.value = '3';
attemptsInput6u._on.change();
check('cambiar los intentos rearma el aviso', ev('hasUnexportedChanges()'), true);

ev(`db.lastExport = db.lastWrite;`);
const currentEvaluator = ev('db.evaluator || "DJ"');
let rosterFrag6u = ev('screenRoster()');
let evInput = findNode(rosterFrag6u, (n) => n.tagName === 'INPUT' && n.attrs.type === 'text' && n.attrs.value === currentEvaluator);
evInput.value = 'MP';
evInput._on.change();
check('cambiar el evaluador rearma el aviso', ev('hasUnexportedChanges()'), true);
ev(`Date.now = __realNow;`); // reloj real de vuelta para el resto de las pruebas

console.log('\n== 6 duodecies. localStorage corrupto no se pisa en silencio (2026-09-24) ==');
const storeKeyName = ev('STORE_KEY');
const corruptRaw = '{esto no es json';
store.set(storeKeyName, corruptRaw);
const recovered = ev('load()');
check('load() devuelve una base en blanco', recovered.athletes.length, 0);
check('records vacío', Object.keys(recovered.records).length, 0);
const preservedKey = [...store.keys()].find((k) => k !== storeKeyName && store.get(k) === corruptRaw);
check('el original dañado se conserva íntegro bajo otra clave', !!preservedKey, true);
check('la clave original no se pisa con la base en blanco', store.get(storeKeyName), corruptRaw);
check('la app recuerda que tuvo que recuperarse de un almacenamiento dañado', ev('storageWasCorrupt'), true);
ev('render()');
check('el banner avisa en pantalla, no arranca como si no hubiera pasado nada',
  byId.banner.children.some((c) => /almacenamiento del teléfono estaba dañado/.test(c._text)), true);
store.delete(storeKeyName); // limpio para las pruebas siguientes, que gestionan su propio volcado

console.log('\n== 6 terdecies. volcado sincrono al pasar a segundo plano (2026-09-24) ==');
ev(`setVal('2026-09-24','ATL-09','alevin','hollow','tiempo', 5);`); // 120 ms de retardo que este script nunca deja correr solo
doc.visibilityState = 'hidden';
fireDoc('visibilitychange');
check('el guardado se volcó sin esperar el debounce de 120 ms',
  JSON.parse(store.get(storeKeyName)).records['2026-09-24|ATL-09|hollow|tiempo'].v, 5);
doc.visibilityState = 'visible';

console.log('\n== 6 quaterdecies. un cronómetro vivo se persiste y se reanuda si la app se relanza (2026-09-24) ==');
ev(`globalThis.__watchTest = mkField('bg-watch', 'ck-bg'); __watchTest.btn.click();`);
check('arrancar el cronómetro deja su t0 en el disco, no solo en memoria',
  ev('db.liveWatches["ck-bg"]'), ev('watches.get(__watchTest.btn).t0'));
fireWin('pagehide');
const persistedAfterHide = JSON.parse(store.get(storeKeyName));
check('pagehide vuelca ese t0 al almacenamiento', persistedAfterHide.liveWatches['ck-bg'], ev('watches.get(__watchTest.btn).t0'));

// "Relanzar": se olvida el estado en memoria y se reconstruye solo desde lo persistido —
// es lo que hace restoreLiveWatches() al arrancar de verdad.
ev(`runningWatches.delete('ck-bg'); restoreLiveWatches();
globalThis.__watchAfter = mkField('bg-watch-relanzado', 'ck-bg');`);
check('tras "relanzar", el campo nace corriendo, no en cero', ev('__watchAfter.btn.textContent'), '⏹');
check('con el mismo t0 de antes de "morir", no uno nuevo',
  ev('runningWatches.get("ck-bg").t0'), persistedAfterHide.liveWatches['ck-bg']);
ev(`watches.get(__watchAfter.btn).t0 -= 1000; runningWatches.get('ck-bg').t0 = watches.get(__watchAfter.btn).t0;
__watchAfter.btn.click();`);
check('limpieza: el cronómetro de la prueba queda parado', ev('runningWatches.has("ck-bg")'), false);

console.log('\n== 6 quindecies. fórmulas neutralizadas en el csv, y aviso de no escribir un nombre (2026-09-24) ==');
check('una celda que empieza por = se neutraliza', ev(`csvCell('=SUMA(A1:A9)')`), "'=SUMA(A1:A9)");
check('también +, - y @', ev(`[csvCell('+1'), csvCell('-1'), csvCell('@cmd')]`), ["'+1", "'-1", "'@cmd"]);
check('un texto normal no se toca', ev(`csvCell('hollow bien ejecutado')`), 'hollow bien ejecutado');
check('una fórmula con coma sigue entrecomillada tras neutralizar', ev(`csvCell('=A1,A2')`), `"'=A1,A2"`);

ev(`db.athletes = [{code:'ATL-01',group:'alevin',active:true}];`);
const detailG = ev(`screenTestDetail({label:'x',tests:['hollow']}, TEST_BY_ID['hollow'])`);
check('el campo de observación avisa de no escribir un nombre', texts(detailG).some((t) => /nunca escribas un nombre/.test(t)), true);
const rosterG = ev('screenRoster()');
check('el campo de evaluador avisa de que solo van iniciales', texts(rosterG).some((t) => /nunca el nombre completo/.test(t)), true);

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
