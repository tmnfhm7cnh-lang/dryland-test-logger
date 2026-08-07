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

const GROUPS = [
  { id: 'alevin', label: 'Alevín', size: 12 },
  { id: 'infantil', label: 'Infantil', size: 10 },
  { id: 'junior', label: 'Junior', size: 6 },
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
 */
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
    blocked: 'No hay barra fija en la sala. Sin barra no hay línea base de P1: captura el sustituto tumbada y no mezcles las dos series.',
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
      { csv: 'video', label: 'Vídeo hecho', type: 'flag', unit: 'si/no' },
      { csv: 'saltos_validos_20s', label: 'Saltos válidos en 20"', type: 'count', unit: 'saltos' },
      { csv: 'tiempo_10_reps', label: 'Tiempo de las 10', type: 'seconds', unit: 's' },
      { csv: 'altura_mejor_salto', label: 'Altura del mejor salto', type: 'cm', unit: 'cm', atHome: true, tag: 'myjumplab' },
      { csv: 'reps_sobre_20cm', label: 'Saltos sobre 20 cm', type: 'count', unit: 'saltos', atHome: true, tag: 'myjumplab' },
      { csv: 'fallos_tecnicos', label: 'Fallos técnicos', type: 'count', unit: 'reps', atHome: true },
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
  { id: 'alevin-s3', group: 'alevin', label: 'Sesión 3 · Test de entrada', hint: 'jue 17-sep', tests: ['flexion', 'squat_jump', 'rpe'] },
  { id: 'alevin-s4', group: 'alevin', label: 'Sesión 4 · Test de entrada', hint: 'mar 22-sep', tests: ['pierna_90', 'elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },

  { id: 'infantil-s1', group: 'infantil', label: 'Sesión 1 · Test mínimo viable', hint: 'jue 10-sep', tests: ['hollow', 'aguante_v', 'v_ups', 'rpe'] },
  { id: 'infantil-s2', group: 'infantil', label: 'Sesión 2 · Test mínimo viable', hint: 'mar 15-sep', tests: ['espagat', 'vertical_3_apoyos', 'elevaciones_colgada', 'elevacion_tumbada', 'rpe'] },
  { id: 'infantil-s3', group: 'infantil', label: 'Sesión 3 · Sobre la marcha', hint: 'jue 17-sep', tests: ['puente_pierna', 'pierna_90', 'rpe'] },
  { id: 'infantil-s4', group: 'infantil', label: 'Sesión 4 · Sobre la marcha', hint: 'mar 22-sep', tests: ['comba', 'rpe'] },

  { id: 'junior-s1', group: 'junior', label: 'Sesión 1 · Batería completa', hint: 'vie 11-sep', tests: null },
];

const FULL_BATTERY = {
  alevin: ['espagat', 'puente', 'hollow', 'plancha', 'pierna_90', 'flexion', 'elevaciones_colgada', 'elevacion_tumbada', 'squat_jump', 'rpe'],
  infantil: ['espagat', 'puente_pierna', 'hollow', 'aguante_v', 'vertical_3_apoyos', 'pierna_90', 'v_ups', 'elevaciones_colgada', 'elevacion_tumbada', 'comba', 'rpe'],
  junior: ['espagat', 'puente_pierna', 'hollow', 'aguante_v', 'vertical_3_apoyos', 'pierna_90', 'v_ups', 'elevaciones_colgada', 'elevacion_tumbada', 'comba', 'rpe'],
};

// Blocks available for every group on top of the dated entry-test ones.
const STANDING_BLOCKS = [
  { id: 'bateria', label: 'Batería completa (re-test)', hint: 'inicio de temporada y antes de cada prueba oficial', tests: null },
  { id: 'movilidad', label: 'Solo movilidad', hint: 'cada 4 semanas', tests: ['espagat', 'puente', 'puente_pierna'] },
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
