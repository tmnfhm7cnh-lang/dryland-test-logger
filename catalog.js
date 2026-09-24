/*
 * Test catalogue for the AQUAMAD dryland battery, season 2026-27.
 *
 * Every `csv` value is written verbatim into privado/mediciones-2026-27.csv.
 * Those identifiers are Spanish because the file schema predates this app and
 * is the source of truth. Code identifiers stay English.
 *
 * Sources:
 *   biblioteca/metodos/metricas-continuas-bateria-seco.md
 *   frentes/natacion-artistica/programacion/03-test-y-monitoreo/plan-de-medicion.md
 */

// `start` is the first athlete number of the group's reserved range, and it must match the
// printed field sheets in privado/hojas-de-campo/ (Alevín 01-12, Infantil 13-22, Junior 23-28).
// Codes are permanent and globally unique: the group an athlete trains with lives in the
// `categoria` column of the CSV, never in the code, because athletes change group.
const GROUPS = [
  { id: 'alevin', label: 'Alevín', size: 12, start: 1 },
  { id: 'infantil', label: 'Infantil', size: 10, start: 13 },
  { id: 'junior', label: 'Junior', size: 6, start: 23 },
];

// Fixed test order, least to most fatiguing. Measuring mobility after a circuit
// gives a false number, so the app sorts every block by this list.
const PHASES = ['movilidad', 'control', 'fuerza', 'potencia', 'resistencia'];

const RUBRIC_VERTICAL = [
  '0 · No sostiene la vertical de 3 apoyos',
  '1 · La sostiene menos de 5"',
  '2 · Sostiene 5" con alineación válida',
  '3 · Baja controlada a espagat sin perder el equilibrio',
  '4 · Completa la rotación de ariana con 3" por espagat',
  '5 · Sube de nuevo a la vertical con piernas estiradas y juntas (criterio oficial)',
];

const RUBRIC_BRIDGE = [
  '0 · No adopta el pino ni con ayuda',
  '1 · Pino con ayuda, sin control de la bajada',
  '2 · Pino con ayuda y bajada a puente controlada',
  '3 · Llega a puente con cadera alta (criterio oficial)',
  '4 · Remonta con ayuda',
  '5 · Remonta sin ayuda lanzando una pierna y luego la otra (criterio oficial)',
];

const RUBRIC_SUPPORT = [
  '0 · Sin mano',
  '1 · Mano apoyada',
  '2 · Mano agarrada',
];

// Added 2026-09-17: Daniel decided Alevín still lacks the maturity for the paired,
// self-timed circuit on the official level tests. Today he runs each swimmer's own
// level test himself and records only the verdict — no cm, no seconds. This is a
// call-of-the-day, not a permanent change: continuous metrics come back once the
// group matures. Reused across every level-test metric below instead of the plain
// `flag` type, because a flag conflates "not judged yet" with "no": a rubric with
// two options keeps "sin marcar" distinguishable from an explicit "no apto".
const RUBRIC_APTO = ['0 · No apto', '1 · Apto (criterio oficial)'];

/*
 * metric.type drives the input widget:
 *   reps | count -> stepper      seconds -> stopwatch + field
 *   cm            -> field       deg     -> field, step 5
 *   level         -> rubric buttons      flag -> toggle
 *   rpe           -> 0-10 buttons
 *
 * metric.atHome  -> not shown poolside; lives in the "En casa" screen.
 * metric.second  -> collapsed behind "más métricas" inside the test.
 * metric.tag     -> appended to observaciones when the metric has a value.
 * metric.min/max -> overrides RANGE_BY_TYPE below for that one metric.
 */

// Sanity bounds by type, not by sport — wide enough that no real measurement of this battery
// should ever hit them, narrow enough to catch the concrete failure that motivated them: a
// time in seconds typed into a length-in-cm field, or the reverse. Added 2026-09-24, §7 del
// LOTE 1. These are physical plausibility bounds, not the sport's pass/fail criteria (those
// live in each test's `criterion` and rubric) — nobody has asked for per-metric thresholds
// tighter than this, so none are invented here; a specific metric can add its own `min`/`max`
// above to narrow it once there's a real number to back it.
const RANGE_BY_TYPE = {
  cm: [0, 250],      // no swimmer's limb or jump is measured in metres
  seconds: [0, 600], // no hold or timed test in this battery runs past ten minutes
  deg: [0, 360],
  reps: [0, 300],
  count: [0, 300],
};
const TESTS = [
  {
    id: 'espagat',
    csv: 'espagat',
    label: 'Espagats',
    phase: 'movilidad',
    who: 'Mide Daniel, con cinta',
    attempts: 2,
    criterion:
      'Femenino: un espagat plano y el otro ≤10 cm de pubis a suelo; frontal ≤15 cm. Rodillas extendidas, pies en punta. Dos intentos por posición, sin rebotes, se anota el mejor. Nunca en frío.',
    metrics: [
      { csv: 'pubis_suelo_der', label: 'Der. delante', type: 'cm', unit: 'cm' },
      { csv: 'pubis_suelo_izq', label: 'Izq. delante', type: 'cm', unit: 'cm' },
      { csv: 'pubis_suelo_frontal', label: 'Frontal', type: 'cm', unit: 'cm' },
      { csv: 'oversplit_der', label: 'Over-split der.', type: 'cm', unit: 'cm', second: true },
      { csv: 'oversplit_izq', label: 'Over-split izq.', type: 'cm', unit: 'cm', second: true },
      { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true },
    ],
    asymmetry: ['pubis_suelo_der', 'pubis_suelo_izq'],
  },
  {
    id: 'puente',
    csv: 'puente',
    label: 'Puente',
    phase: 'movilidad',
    who: 'Foto lateral, ángulos en casa',
    criterion:
      'Brazos perpendiculares al suelo y codos estirados, piernas juntas y rodillas estiradas. Tolerancia 15° en brazos, 10° en codos y rodillas. Foto desde el mismo punto marcado con cinta, móvil a la altura de la cadera.',
    metrics: [
      { csv: 'foto_lateral', label: 'Foto hecha', type: 'flag', unit: 'si/no' },
      { csv: 'tiempo', label: 'Mantenimiento', type: 'seconds', unit: 's', second: true },
      { csv: 'distancia_manos_pies', label: 'Manos–pies', type: 'cm', unit: 'cm', second: true },
      { csv: 'altura_cadera', label: 'Altura de cadera', type: 'cm', unit: 'cm', second: true },
      { csv: 'desviacion_brazo', label: 'Desviación del brazo', type: 'deg', unit: 'grados', atHome: true },
      { csv: 'flexion_codo', label: 'Flexión de codo', type: 'deg', unit: 'grados', atHome: true },
      { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true },
    ],
  },
  {
    id: 'puente_pierna',
    csv: 'puente_pierna',
    label: 'Puente + pierna estirada',
    phase: 'movilidad',
    who: 'Foto lateral, ángulos en casa',
    criterion:
      'Puente con criterio válido y subida de una pierna estirada. Mismo protocolo de foto que el puente: mismo punto, misma altura de cámara.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'foto_lateral', label: 'Foto hecha', type: 'flag', unit: 'si/no' },
      { csv: 'tiempo', label: 'Mantenimiento', type: 'seconds', unit: 's', second: true },
      { csv: 'altura_pie_der', label: 'Altura pie der.', type: 'cm', unit: 'cm', atHome: true },
      { csv: 'altura_pie_izq', label: 'Altura pie izq.', type: 'cm', unit: 'cm', atHome: true },
      { csv: 'desviacion_brazo', label: 'Desviación del brazo', type: 'deg', unit: 'grados', atHome: true },
      { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true },
    ],
  },
  {
    id: 'hollow',
    csv: 'hollow',
    label: 'Hollow',
    phase: 'control',
    who: 'Cronometra la compañera',
    criterion:
      'Lumbar pegada al suelo, piernas juntas y pies en punta. El cronómetro se para en la primera pérdida de alineación visible.',
    metrics: [
      { csv: 'tiempo', label: 'Tiempo', type: 'seconds', unit: 's' },
      { csv: 'reps_fallo_tecnico', label: 'Fallos técnicos', type: 'count', unit: 'reps', second: true },
    ],
  },
  {
    id: 'plancha',
    csv: 'plancha',
    label: 'Plancha alineada',
    phase: 'control',
    who: 'Cronometra la compañera',
    criterion:
      'Alineación oreja–tobillo, muñecas bajo hombros, codos estirados, piernas juntas. El criterio oficial son 20". Se para en la primera pérdida de alineación.',
    metrics: [{ csv: 'tiempo', label: 'Tiempo', type: 'seconds', unit: 's' }],
  },
  {
    id: 'aguante_v',
    csv: 'aguante_v',
    label: 'Aguante en V',
    phase: 'control',
    who: 'Cronometra la compañera',
    criterion: 'Criterio oficial: 10" en posición de V, piernas y brazos estirados.',
    metrics: [
      { csv: 'tiempo', label: 'Tiempo', type: 'seconds', unit: 's' },
      { csv: 'angulo_v', label: 'Ángulo de la V', type: 'deg', unit: 'grados', atHome: true },
    ],
  },
  {
    id: 'vertical_3_apoyos',
    csv: 'vertical_3_apoyos',
    label: 'Vertical de 3 apoyos',
    phase: 'control',
    who: 'Criterio de Daniel',
    attempts: 2,
    criterion: 'Rúbrica de 6 niveles. Dos intentos declarados; se anota el nivel más alto alcanzado de forma consistente.',
    metrics: [
      { csv: 'nivel', label: 'Nivel', type: 'level', unit: 'nivel', rubric: RUBRIC_VERTICAL },
      { csv: 'tiempo', label: 'Mantenimiento', type: 'seconds', unit: 's' },
    ],
  },
  {
    id: 'pino_puente',
    csv: 'pino_puente',
    label: 'Pino → puente → remontada',
    phase: 'control',
    who: 'Criterio de Daniel · se anota en continuo',
    attempts: 2,
    criterion: 'Rúbrica de 6 niveles. No hace falta pasarla como prueba: se anota el nivel el día que aparezca en sesión.',
    metrics: [
      { csv: 'nivel', label: 'Nivel', type: 'level', unit: 'nivel', rubric: RUBRIC_BRIDGE },
      { csv: 'tiempo_bajada', label: 'Fase de bajada', type: 'seconds', unit: 's', second: true },
    ],
  },
  {
    id: 'pierna_90',
    csv: 'pierna_90',
    label: 'Pierna a 90°, tres direcciones',
    phase: 'control',
    who: 'Cronometra la compañera',
    criterion:
      'Mantener la pierna a 90° o más delante, al lado y atrás, con cada pierna. Alevín 2: 8". Infantil: 12". Se permite apoyar una mano. Atrás es siempre la peor y la que más informa.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'aguante_delante_der', label: 'Delante der.', type: 'seconds', unit: 's' },
      { csv: 'aguante_delante_izq', label: 'Delante izq.', type: 'seconds', unit: 's' },
      { csv: 'aguante_lado_der', label: 'Lado der.', type: 'seconds', unit: 's' },
      { csv: 'aguante_lado_izq', label: 'Lado izq.', type: 'seconds', unit: 's' },
      { csv: 'aguante_atras_der', label: 'Atrás der.', type: 'seconds', unit: 's' },
      { csv: 'aguante_atras_izq', label: 'Atrás izq.', type: 'seconds', unit: 's' },
      { csv: 'nivel_apoyo', label: 'Nivel de apoyo', type: 'level', unit: 'nivel', rubric: RUBRIC_SUPPORT, second: true },
      { csv: 'angulo_caida_atras', label: 'Ángulo real atrás', type: 'deg', unit: 'grados', atHome: true },
    ],
  },
  {
    id: 'v_ups',
    csv: 'v_ups',
    label: 'V-ups',
    phase: 'fuerza',
    who: 'Cuenta la compañera en voz alta',
    criterion: 'Criterio oficial: 20 repeticiones con piernas y brazos totalmente estirados. Los pies no tocan el suelo.',
    metrics: [
      { csv: 'reps', label: 'Reps válidas', type: 'reps', unit: 'reps' },
      { csv: 'reps_pies_al_suelo', label: 'Pies al suelo', type: 'count', unit: 'reps', second: true },
    ],
  },
  {
    id: 'flexion',
    csv: 'flexion',
    label: 'Flexiones',
    phase: 'fuerza',
    who: 'Criterio de Daniel',
    criterion:
      'Criterio oficial: 5 flexiones con codos pegados a las costillas y extensión completa, máximo 1 incompleta. Quien no hace ninguna: el dato útil es la altura del plano inclinado o los segundos de excéntrica, nunca un 0.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'reps', label: 'Reps válidas', type: 'reps', unit: 'reps' },
      { csv: 'altura_plano', label: 'Altura del plano', type: 'cm', unit: 'cm' },
      { csv: 'excentrica', label: 'Excéntrica controlada', type: 'seconds', unit: 's', second: true },
      { csv: 'profundidad', label: 'Profundidad pecho–suelo', type: 'cm', unit: 'cm', atHome: true },
    ],
  },
  {
    id: 'elevaciones_colgada',
    csv: 'elevaciones_colgada',
    label: 'Elevaciones colgada',
    phase: 'fuerza',
    who: 'Criterio de Daniel',
    // Rectified 2026-08-11: there IS an espaldera in September, so P1 does get a baseline.
    // The apparatus is the thing that changes (espaldera now, possibly barra from October), and
    // a change of apparatus invalidates a direct comparison — hence the `instrumento` column.
    apparatus: ['espaldera', 'barra'],
    criterion: 'Criterio oficial: 12 elevaciones por encima de 90° respecto al tronco + 5" de carpa.',
    metrics: [
      { csv: 'reps', label: 'Reps sobre 90°', type: 'reps', unit: 'reps' },
      { csv: 'tiempo_carpa', label: 'Carpa', type: 'seconds', unit: 's' },
      { csv: 'tiempo_colgada', label: 'Agarre (total colgada)', type: 'seconds', unit: 's' },
      { csv: 'angulo_maximo', label: 'Ángulo máximo', type: 'deg', unit: 'grados', atHome: true },
    ],
  },
  {
    id: 'elevacion_tumbada',
    csv: 'elevacion_tumbada',
    label: 'Elevación tumbada (sustituto sin barra)',
    phase: 'fuerza',
    who: 'Cuenta la compañera',
    criterion:
      'Sustituto de la escalera de P4 mientras no haya barra. Se anota el método para no mezclar series. Rango activo y pasivo: pasivo llega y activo no → fuerza; pasivo no llega → movilidad. El arado carga el cuello: sobre colchoneta y con supervisión.',
    metrics: [
      { csv: 'reps_activo', label: 'Reps rango activo', type: 'reps', unit: 'reps', tag: 'sin barra' },
      { csv: 'rango_pasivo', label: 'Rango pasivo llega', type: 'flag', unit: 'si/no', tag: 'sin barra' },
    ],
  },
  {
    id: 'squat_jump',
    csv: 'squat_jump',
    label: 'Squat jump',
    phase: 'potencia',
    who: 'Vídeo + conteo de Daniel',
    criterion:
      '10 repeticiones en un máximo de 20 s, 90° de rodilla, rodillas sin pasar las puntas, extensión completa. Altura mínima 20 cm (un palmo). Es potencia repetida, no salto máximo.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'video', label: 'Vídeo hecho', type: 'flag', unit: 'si/no' },
      { csv: 'saltos_validos_20s', label: 'Saltos válidos en 20"', type: 'count', unit: 'saltos' },
      { csv: 'tiempo_10_reps', label: 'Tiempo de las 10', type: 'seconds', unit: 's' },
      { csv: 'altura_mejor_salto', label: 'Altura del mejor salto', type: 'cm', unit: 'cm', atHome: true, tag: 'myjumplab' },
      { csv: 'reps_sobre_20cm', label: 'Saltos sobre 20 cm', type: 'count', unit: 'saltos', atHome: true, tag: 'myjumplab' },
      { csv: 'fallos_tecnicos', label: 'Fallos técnicos', type: 'count', unit: 'reps', atHome: true },
    ],
  },
  {
    // Added 2026-09-17: Alevín 2's own official test #5, missing until now because the
    // catalogue only had Alevín 1's fase-1 content (flexión, squat_jump). Today Alevín
    // splits by level for the first time.
    id: 'burpees',
    csv: 'burpees',
    label: '8 burpees + flexión de tríceps',
    phase: 'potencia',
    who: 'Criterio de Daniel',
    criterion:
      '8 repeticiones completas, máximo 1 incompleta. Salto con pies juntos de más de un palmo (20 cm). Lumbar rígida. Prueba oficial de Alevín 2 — no la hace Alevín 1.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'reps_completas', label: 'Reps completas', type: 'reps', unit: 'reps', second: true },
    ],
  },
  {
    // Added 2026-09-17, same reason as burpees: Alevín 2's official test #7.
    id: 'dominadas',
    csv: 'dominadas',
    label: 'Dominadas pronación y supinación',
    phase: 'fuerza',
    who: 'Criterio de Daniel',
    criterion:
      'Colgada con pies sin apoyo. Una dominada en pronación hasta pasar la barbilla la barra + aguantar 5" con la barbilla por encima, piernas juntas y pies en punta. Repetir en supinación + 5". Cada dominada parte de máximo 10° de flexión de codo. Prueba oficial de Alevín 2 — no la hace Alevín 1.',
    metrics: [
      { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: RUBRIC_APTO },
      { csv: 'tiempo_pronacion', label: 'Aguante pronación', type: 'seconds', unit: 's', second: true },
      { csv: 'tiempo_supinacion', label: 'Aguante supinación', type: 'seconds', unit: 's', second: true },
    ],
  },
  {
    id: 'comba',
    csv: 'comba',
    label: 'Comba, un minuto',
    phase: 'resistencia',
    who: 'Cuenta la compañera',
    criterion: 'Saltos completos en 60 s. El dato que decide el apto no es el total, son los fallos.',
    metrics: [
      { csv: 'saltos_60s', label: 'Saltos en 60"', type: 'count', unit: 'saltos' },
      { csv: 'fallos', label: 'Fallos', type: 'count', unit: 'fallos' },
      { csv: 'max_consecutivos', label: 'Máx. seguidos', type: 'count', unit: 'saltos', second: true },
    ],
  },
  {
    id: 'rpe',
    csv: 'sesion',
    label: 'RPE de la sesión',
    phase: 'resistencia',
    who: 'Diez segundos por nadadora, al acabar',
    criterion: 'Cuánto le ha costado la sesión, de 0 a 10. La medida de carga interna más barata que existe: va en todas las sesiones.',
    metrics: [{ csv: 'rpe', label: 'RPE', type: 'rpe', unit: '0-10' }],
  },
];

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
