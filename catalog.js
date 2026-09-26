/*
 * Test catalogue for the AQUAMAD dryland battery, season 2026-27.
 *
 * LOTE 5 §1 of the prompt maestro: the battery itself — cohorts and their code ranges, the
 * `ATL-` prefix, phases, rubrics, metric types with their rounding/range, and the tests — is no
 * longer hardcoded here. It lives in battery-aquamad.js as an importable document (schema
 * `battery/1`), loaded before this file. This file is a thin adapter: it unpacks that document
 * into the globals the rest of the app already reads (GROUPS, PHASES, RANGE_BY_TYPE,
 * ROUND_BY_TYPE, ATHLETE_CODE_PREFIX, TESTS, TEST_BY_ID) — nothing downstream had to change to
 * read a document instead of a constant.
 *
 * What stays here, on purpose: which tests make up each session block. That schedule is
 * specific to this club's calendar this season (ENTRY_BLOCKS carries real dates), not to the
 * battery itself — a second battery would want its own schedule, not this one.
 */

const ATHLETE_CODE_PREFIX = BATTERY_AQUAMAD.athleteCodePrefix;
const GROUPS = BATTERY_AQUAMAD.cohorts;
const PHASES = BATTERY_AQUAMAD.phases;
const RANGE_BY_TYPE = Object.fromEntries(Object.entries(BATTERY_AQUAMAD.metricTypes).map(([type, def]) => [type, def.range]));
const ROUND_BY_TYPE = Object.fromEntries(Object.entries(BATTERY_AQUAMAD.metricTypes).map(([type, def]) => [type, def.round]));

// A metric's `rubric` is a key into BATTERY_AQUAMAD.rubrics in the document (so the same rubric
// text isn't repeated per test); resolve it to the actual option array here, once, so the rest
// of the app keeps reading `metric.rubric` as an array like it always did.
const TESTS = BATTERY_AQUAMAD.tests.map((t) => ({
  ...t,
  metrics: t.metrics.map((m) => (m.rubric ? { ...m, rubric: BATTERY_AQUAMAD.rubrics[m.rubric] } : m)),
}));

const TEST_BY_ID = Object.fromEntries(TESTS.map((t) => [t.id, t]));

const ENTRY_BLOCKS = [
  { id: 'alevin-s1', group: 'alevin', label: 'Sesión 1 · Test de entrada', hint: 'jue 10-sep', tests: ['hollow', 'plancha', 'rpe'] },
  { id: 'alevin-s2', group: 'alevin', label: 'Sesión 2 · Test de entrada', hint: 'mar 15-sep', tests: ['espagat', 'puente', 'rpe'] },
  // 2026-09-17: reprogramada. Alevín deja el circuito con automedición entre compañeras
  // para las pruebas de nivel —Daniel no ve madurez suficiente todavía— y pasa a
  // ejecutar la prueba de nivel propia de cada subgrupo, apto/no apto. flexion y
  // squat_jump son las de Alevín 1; burpees y dominadas, las de Alevín 2. La app no
  // distingue subgrupos: cada test lista a las 12, y Daniel solo rellena las que le
  // toca esa prueba.
  { id: 'alevin-s3', group: 'alevin', label: 'Sesión 3 · Pruebas de nivel (apto/no apto)', hint: 'jue 17-sep · Alevín 1: flexión + squat jump · Alevín 2: burpees + dominadas', tests: ['flexion', 'squat_jump', 'burpees', 'dominadas', 'rpe'] },
  { id: 'alevin-s4', group: 'alevin', label: 'Sesión 4 · Test de entrada', hint: 'mar 22-sep', tests: ['pierna_90', 'elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },

  { id: 'infantil-s1', group: 'infantil', label: 'Sesión 1 · Test mínimo viable', hint: 'jue 10-sep', tests: ['hollow', 'aguante_v', 'v_ups', 'rpe'] },
  { id: 'infantil-s2', group: 'infantil', label: 'Sesión 2 · Test mínimo viable', hint: 'mar 15-sep', tests: ['espagat', 'vertical_3_apoyos', 'elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },
  // 2026-09-17: puente_pierna y pierna_90 ya son pruebas oficiales de Infantil
  // (#7 y #6) — añadido el apto/no apto de cada una, además de sus cm/segundos.
  { id: 'infantil-s3', group: 'infantil', label: 'Sesión 3 · Sobre la marcha + apto/no apto', hint: 'jue 17-sep', tests: ['puente_pierna', 'pierna_90', 'rpe'] },
  // 2026-09-20: este bloque era solo comba + rpe, y era el unico martes de Infantil
  // sin nada que recuperase P1. La colgada de la sesion 2 (mar 15-sep) no llego al CSV
  // —la estacion 1 de aquel circuito fue "colgada de companera o de pared", que no
  // cuenta como espaldera—, asi que Infantil no tiene linea base de su prueba oficial
  // n.1 y la espaldera deja de estar disponible el 1-oct. elevacion_tumbada entra el
  // mismo dia a proposito: es la unica de las dos que se podra repetir en octubre, y
  // sin las dos medidas a la vez no hay forma de enlazar las series cuando se cierre
  // el pabellon. Ver plan-de-medicion.md §7.
  { id: 'infantil-s4', group: 'infantil', label: 'Sesión 4 · Sobre la marcha + recuperación de P1', hint: 'mar 22-sep · colgada en espaldera, última ventana antes del 1-oct', tests: ['comba', 'elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },

  { id: 'junior-s1', group: 'junior', label: 'Sesión 1 · Batería completa', hint: 'vie 11-sep', tests: null },

  // 2026-09-20: Junior tampoco tiene ninguna fila de elevaciones_colgada —la bateria
  // completa del 11-sep se dio sin ella—. Su sesion 3 es el ultimo viernes entero
  // dentro de la ventana de espaldera (la 4 cae el 2-oct, un dia tarde) y su bloque de
  // fuerza ya lleva P1 como prioridad alta, asi que la medicion es el contenido.
  { id: 'junior-s3', group: 'junior', label: 'Sesión 3 · Recuperación de P1', hint: 'vie 25-sep · colgada en espaldera, última ventana antes del 1-oct', tests: ['elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },
];

const FULL_BATTERY = {
  alevin: ['espagat', 'puente', 'hollow', 'plancha', 'pierna_90', 'flexion', 'burpees', 'dominadas', 'elevaciones_colgada', 'elevacion_tumbada', 'squat_jump', 'rpe'],
  infantil: ['espagat', 'puente_pierna', 'hollow', 'aguante_v', 'vertical_3_apoyos', 'pierna_90', 'v_ups', 'elevaciones_colgada', 'elevacion_tumbada', 'comba', 'rpe'],
  junior: ['espagat', 'puente_pierna', 'hollow', 'aguante_v', 'vertical_3_apoyos', 'pierna_90', 'v_ups', 'elevaciones_colgada', 'elevacion_tumbada', 'comba', 'rpe'],
};

// Blocks available for every group on top of the dated entry-test ones.
const STANDING_BLOCKS = [
  { id: 'bateria', label: 'Batería completa (re-test)', hint: 'inicio de temporada y antes de cada prueba oficial', tests: null },
  { id: 'movilidad', label: 'Solo movilidad', hint: 'cada 4 semanas', tests: ['espagat', 'puente', 'puente_pierna'] },
  // burpees y dominadas se quedan fuera de este bloque compartido a propósito: son
  // pruebas oficiales solo de Alevín 2 y este bloque lo ven los tres grupos por igual
  // (blocksForGroup). Entran en FULL_BATTERY.alevin y en el bloque fechado de hoy.
  { id: 'fuerza', label: 'Solo fuerza y potencia', hint: 'cada 6 semanas', tests: ['flexion', 'v_ups', 'elevaciones_colgada', 'elevacion_tumbada', 'squat_jump'] },
  { id: 'rubricas', label: 'Rúbricas en continuo', hint: 'el día que aparezca en sesión', tests: ['pino_puente', 'vertical_3_apoyos'] },
  { id: 'solo-rpe', label: 'Solo RPE', hint: 'todas las sesiones', tests: ['rpe'] },
];

function blocksForGroup(groupId) {
  const dated = ENTRY_BLOCKS.filter((b) => b.group === groupId);
  const standing = STANDING_BLOCKS.map((b) => ({ ...b, id: `${groupId}-${b.id}`, group: groupId }));
  return [...dated, ...standing].map((b) => ({
    ...b,
    tests: sortByPhase((b.tests || FULL_BATTERY[groupId]).filter((id) => TEST_BY_ID[id])),
  }));
}

function sortByPhase(testIds) {
  return [...testIds].sort((a, b) => PHASES.indexOf(TEST_BY_ID[a].phase) - PHASES.indexOf(TEST_BY_ID[b].phase));
}
