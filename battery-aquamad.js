/*
 * Battery document, schema `battery/1` — LOTE 5 §1 of the prompt maestro.
 *
 * Everything in this file used to be hardcoded inside catalog.js: which tests exist, which
 * cohorts exist and what code range each owns, the phase order, the rubric texts, and the
 * rounding/range rule per metric type. catalog.js now reads BATTERY_AQUAMAD instead of
 * defining those constants itself — see the comment at the top of catalog.js.
 *
 * This is the AQUAMAD battery for the 2026-27 season: the one real battery this app has ever
 * run. It becomes "the default battery" the day a second one exists; today it is the only one,
 * so nothing downstream branches on `battery`/`id` yet.
 *
 * `csv` values are written verbatim into privado/mediciones-2026-27.csv and stay Spanish because
 * that file's schema predates this app and is the source of truth. Everything else in this
 * object is content Daniel wrote for this battery, not a code identifier.
 *
 * Sources (unchanged from catalog.js):
 *   biblioteca/metodos/metricas-continuas-bateria-seco.md
 *   frentes/natacion-artistica/programacion/03-test-y-monitoreo/plan-de-medicion.md
 *
 * Left out of this document on purpose, still in catalog.js: ENTRY_BLOCKS (this season's dated
 * schedule), STANDING_BLOCKS and FULL_BATTERY (which tests make up a session block). LOTE 5 §1
 * asked for the tests, cohorts, phases, rubrics, metric types and thresholds — not the session
 * schedule, which is specific to this club's calendar, not to the battery itself.
 */
const BATTERY_AQUAMAD = {
  battery: 'battery/1',
  id: 'aquamad-2026-27',
  label: 'AQUAMAD, temporada 2026-27',

  // The prefix every athlete code starts with, and the reserved number range per cohort — must
  // match the printed field sheets in privado/hojas-de-campo/ (Alevín 01-12, Infantil 13-22,
  // Junior 23-28). Codes are permanent and globally unique: the cohort an athlete trains with
  // lives in the `categoria` column of the CSV, never in the code, because athletes change group.
  athleteCodePrefix: 'ATL-',
  cohorts: [
    { id: 'alevin', label: 'Alevín', size: 12, start: 1 },
    { id: 'infantil', label: 'Infantil', size: 10, start: 13 },
    { id: 'junior', label: 'Junior', size: 6, start: 23 },
  ],

  // Fixed test order, least to most fatiguing. Measuring mobility after a circuit gives a false
  // number, so the app sorts every block by this list.
  phases: ['movilidad', 'control', 'fuerza', 'potencia', 'resistencia'],

  // `round` and `range` are sanity bounds by type, not by sport — wide enough that no real
  // measurement of this battery should ever hit them, narrow enough to catch the concrete
  // failure that motivated them: a time in seconds typed into a length-in-cm field, or the
  // reverse. These are physical plausibility bounds, not the sport's pass/fail criteria (those
  // live in each test's `criterion` and rubric) — a specific metric can still narrow `range`
  // with its own `min`/`max`. `round` names the declared rounding: whole centimetres, seconds to
  // one decimal, degrees in steps of 5. Types with a rubric or a toggle widget (`level`, `flag`,
  // `rpe`) have no numeric rounding/range: they never reach the number field.
  metricTypes: {
    cm: { round: 'integer', range: [0, 250] },
    seconds: { round: 'tenth', range: [0, 600] },
    deg: { round: 'step5', range: [0, 360] },
    reps: { round: 'integer', range: [0, 300] },
    count: { round: 'integer', range: [0, 300] },
  },

  rubrics: {
    vertical: [
      '0 · No sostiene la vertical de 3 apoyos',
      '1 · La sostiene menos de 5"',
      '2 · Sostiene 5" con alineación válida',
      '3 · Baja controlada a espagat sin perder el equilibrio',
      '4 · Completa la rotación de ariana con 3" por espagat',
      '5 · Sube de nuevo a la vertical con piernas estiradas y juntas (criterio oficial)',
    ],
    bridge: [
      '0 · No adopta el pino ni con ayuda',
      '1 · Pino con ayuda, sin control de la bajada',
      '2 · Pino con ayuda y bajada a puente controlada',
      '3 · Llega a puente con cadera alta (criterio oficial)',
      '4 · Remonta con ayuda',
      '5 · Remonta sin ayuda lanzando una pierna y luego la otra (criterio oficial)',
    ],
    support: ['0 · Sin mano', '1 · Mano apoyada', '2 · Mano agarrada'],
    // Added 2026-09-17: Daniel decided Alevín still lacks the maturity for the paired,
    // self-timed circuit on the official level tests. Today he runs each swimmer's own level
    // test himself and records only the verdict — no cm, no seconds. This is a call-of-the-day,
    // not a permanent change: continuous metrics come back once the group matures. Reused across
    // every level-test metric below instead of the plain `flag` type, because a flag conflates
    // "not judged yet" with "no": a rubric with two options keeps "sin marcar" distinguishable
    // from an explicit "no apto".
    apto: ['0 · No apto', '1 · Apto (criterio oficial)'],
  },

  /*
   * metric.type drives the input widget (unchanged, still decided in app.js):
   *   reps | count -> stepper      seconds -> stopwatch + field
   *   cm            -> field       deg     -> field, step 5
   *   level         -> rubric buttons      flag -> toggle
   *   rpe           -> 0-10 buttons
   *
   * metric.atHome  -> not shown poolside; lives in the "En casa" screen.
   * metric.second  -> collapsed behind "más métricas" inside the test.
   * metric.tag     -> appended to observaciones when the metric has a value.
   * metric.min/max -> overrides metricTypes[type].range above for that one metric.
   * metric.rubric  -> a key into `rubrics` above, for type `level`.
   */
  tests: [
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
        { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        // desviacion_brazo no lleva guide: angle-lab todavía no tiene la clase de medida
        // "ángulo entre dos rectas / referencia vertical" que ese ángulo necesita (LOTE 5 §2).
        { csv: 'desviacion_brazo', label: 'Desviación del brazo', type: 'deg', unit: 'grados', atHome: true },
        { csv: 'flexion_codo', label: 'Flexión de codo', type: 'deg', unit: 'grados', atHome: true, guide: true },
        { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
        { csv: 'foto_lateral', label: 'Foto hecha', type: 'flag', unit: 'si/no' },
        { csv: 'tiempo', label: 'Mantenimiento', type: 'seconds', unit: 's', second: true },
        // altura_pie_der/izq no llevan guide: son DISTANCE, y sin la interfaz de calibración
        // de F6 saldrían siempre en píxeles sin calibrar — mismo límite que flexion.profundidad
        // (que sí se decidió construir igual), pero aquí no se ha vuelto a preguntar.
        { csv: 'altura_pie_der', label: 'Altura pie der.', type: 'cm', unit: 'cm', atHome: true },
        { csv: 'altura_pie_izq', label: 'Altura pie izq.', type: 'cm', unit: 'cm', atHome: true },
        { csv: 'desviacion_brazo', label: 'Desviación del brazo', type: 'deg', unit: 'grados', atHome: true },
        { csv: 'flexion_rodilla', label: 'Flexión de rodilla', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        { csv: 'angulo_v', label: 'Ángulo de la V', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        { csv: 'nivel', label: 'Nivel', type: 'level', unit: 'nivel', rubric: 'vertical' },
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
        { csv: 'nivel', label: 'Nivel', type: 'level', unit: 'nivel', rubric: 'bridge' },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
        { csv: 'aguante_delante_der', label: 'Delante der.', type: 'seconds', unit: 's' },
        { csv: 'aguante_delante_izq', label: 'Delante izq.', type: 'seconds', unit: 's' },
        { csv: 'aguante_lado_der', label: 'Lado der.', type: 'seconds', unit: 's' },
        { csv: 'aguante_lado_izq', label: 'Lado izq.', type: 'seconds', unit: 's' },
        { csv: 'aguante_atras_der', label: 'Atrás der.', type: 'seconds', unit: 's' },
        { csv: 'aguante_atras_izq', label: 'Atrás izq.', type: 'seconds', unit: 's' },
        { csv: 'nivel_apoyo', label: 'Nivel de apoyo', type: 'level', unit: 'nivel', rubric: 'support', second: true },
        { csv: 'angulo_caida_atras', label: 'Ángulo real atrás', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
        { csv: 'reps', label: 'Reps válidas', type: 'reps', unit: 'reps' },
        { csv: 'altura_plano', label: 'Altura del plano', type: 'cm', unit: 'cm' },
        { csv: 'excentrica', label: 'Excéntrica controlada', type: 'seconds', unit: 's', second: true },
        { csv: 'profundidad', label: 'Profundidad pecho–suelo', type: 'cm', unit: 'cm', atHome: true, guide: true },
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
        { csv: 'angulo_maximo', label: 'Ángulo máximo', type: 'deg', unit: 'grados', atHome: true, guide: true },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
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
        { csv: 'apto', label: 'Resultado', type: 'level', unit: 'nivel', rubric: 'apto' },
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
  ],

  /*
   * Segunda mitad del punto 1 del LOTE 5: "todas las cadenas de la interfaz". Antes vivían
   * escritas a mano en app.js e index.html — el chrome de la app (pestañas, cabeceras,
   * avisos, botones, diálogos), no el contenido de ninguna prueba (eso ya estaba arriba).
   * Una app para otro club u otro deporte querría su propio "Nadadoras"/"nadadora" y su
   * propio texto de cabecera; no querría, en cambio, reescribir catalog.js ni app.js.
   *
   * `{token}` marca un hueco que rellena app.js con t(key, vars) — ver catalog.js. Los
   * emoji/símbolos (⏱ 📤 💾 🔴 ⚠ ↩︎ 🗑 ✓ ‹) se dejan dentro de la cadena a propósito: son
   * parte del texto que un traductor tocaría también, no marcado de app.js.
   */
  strings: {
    appTitle: 'Registro de tests · seco',
    appShortTitle: 'Test seco',
    ariaGroup: 'Grupo',
    ariaDate: 'Fecha',

    navSession: 'Sesión',
    navAtHome: 'En casa',
    navRoster: 'Nadadoras',
    navHistory: 'Historial',
    navExport: 'Exportar',

    watchTitle: 'Cronómetro',
    roomClockButton: '⏱ Reloj de sala',
    roomClockNote: 'Para las pruebas de aguante: se abre en el iPad, se apoya donde lo vean todas y no lo toca nadie. Arrancan a la vez y cada compañera canta el código y el número cuando se rompe el criterio.',
    roomClockHint: 'Toca el número para arrancar y parar. Nadie más toca esta pantalla.',
    roomClockZero: 'Poner a cero',
    roomClockExit: 'Salir',

    backToBlocks: '‹ Bloques',
    backPrefix: '‹ ',
    blocksTitle: 'Qué se captura hoy',
    blocksSubtitle: '{count} nadadoras activas en {group}. Elige el bloque de la sesión.',
    noAthletesInGroup: 'Todavía no hay nadadoras en este grupo. Ve a la pestaña {rosterTab} y añádelas: el código se asigna por orden de aparición, nunca por el nombre.',
    testsOrderNote: 'Orden fijo de menos a más fatigante: movilidad → control → fuerza → potencia → resistencia. Ve rotando parejas dentro de cada prueba.',
    testBlockedPill: 'sin barra',

    attemptsDeclared: 'Intentos declarados: {n}.',
    apparatusMissingWarning: '🔴 Di en qué aparato se mide, antes de apuntar',
    apparatusChosen: 'Aparato: {name}',
    apparatusNote: 'Va a la columna instrumento del CSV. Una elevación en espaldera y una en barra no son el mismo gesto: sin este dato, en diciembre no sabrás si cambió la nadadora o el aparato.',
    // LOTE 5 §6: era dos cadenas ("grande entre lados" a partir de 5 cm) — el prompt maestro
    // exige que la app "mida y reporte, no diagnostique ni recomiende", y calificar una cifra de
    // "grande" es ya un juicio, no una medida. Una sola cadena, la cifra sola; el color de aviso
    // (.asym.high en index.html) se queda como señal visual neutra, mismo trato que el semáforo
    // de calidad de angle-lab.
    asymmetryDiff: 'Asimetría: {diff} cm',
    moreWithVideo: 'Más métricas, vídeo, nota e intentos',
    moreNoVideo: 'Más métricas, nota e intentos',
    atHomeTagSuffix: ' · de vídeo',
    attemptsUsedLabel: 'Intentos usados',
    observationPlaceholder: 'Observación (va al CSV)',
    observationLabel: 'Observación',
    observationNote: 'Va al CSV compartido: describe el gesto, nunca escribas un nombre.',
    noActiveAthletes: 'No hay nadadoras activas en este grupo.',
    doneCheck: '✓',
    donePending: 'pendiente',

    atHomeTitle: 'Análisis en casa',
    atHomeNote: 'Lo que sale del vídeo, de la foto o de My Jump Lab. Pásalo el mismo día: My Jump Lab no guarda tu serie de forma recuperable.',
    atHomeEmpty: 'Nada pendiente. Aquí aparecerán las alturas de salto, los grados del puente y los ángulos en cuanto captures algo en sesión.',
    atHomeSkip: 'no aplica',
    atHomeAnalyze: 'Analizar en angle-lab',

    rosterTitle: 'Nadadoras',
    rosterNote: 'Solo códigos. El mapa código ↔ nombre vive en papel, en tu carpeta, nunca aquí. Cada grupo tiene su rango reservado —{ranges}— igual que las hojas impresas, y un código no se reutiliza jamás.',
    rosterGroupRange: '{group} usa de {from} a {to}. Asígnalos en el pase de lista, todos de golpe y antes de medir nada.',
    addAthlete: '+ Añadir nadadora a {group}',
    completeGroup: '+ Completar el grupo: crear {n} códigos de golpe',
    groupHeader: '{group} — {active} activas de {size} previstas',
    athleteActive: 'activa',
    athleteInactive: 'de baja',
    fieldGroupLabel: 'Grupo',

    historyTitle: 'Historial',
    historyNote: 'Toda la temporada de una nadadora, prueba por prueba. Los datos ya estaban guardados: esto solo los enseña.',
    historyNoAthletes: 'Todavía no hay ninguna nadadora dada de alta. Ve a la pestaña {rosterTab} y añade alguna.',
    historyPickAthlete: 'Toca un código arriba para ver su historial.',
    historyEmptyForAthlete: '{code} no tiene ninguna medición guardada todavía.',
    historyDateColumn: 'Fecha',

    evaluatorHeader: 'Evaluador',
    evaluatorFieldLabel: 'Iniciales que van a la columna evaluador',
    evaluatorNote: 'Solo iniciales (p. ej. DJ), nunca el nombre completo.',

    exportTitle: 'Exportar',
    exportSummaryDirty: '{total} mediciones guardadas · {pend} sin exportar{extra}.',
    exportSummaryClean: '{total} mediciones guardadas · nada sin exportar.',
    exportExtraChanges: ' (cambios en nota, aparato, intentos o evaluador)',
    exportAlwaysNote: 'Exporta al acabar cada sesión, sin excepción. El navegador del iPhone puede borrar los datos de una web que no se usa; el CSV en OneDrive no.',
    orphansWarning: '⚠ {n} fila(s) de una prueba que ya no está en el catálogo ({ids}). Se exportan igual con el id crudo — revísalas antes de compartir.',
    shareCSV: '📤 Compartir CSV → Archivos / OneDrive',
    backupJSON: '💾 Copia de seguridad completa (JSON)',
    restoreConfirm: 'Restaurar {n} mediciones. Se reemplaza todo lo que hay ahora. ¿Seguro?',
    restoreInvalid: 'Ese archivo no es una copia válida.',
    restoreButton: '↩︎ Restaurar desde una copia',
    previewHeader: 'Vista previa',
    resetHeader: 'Empezar de cero',
    resetWarning: 'Borra las mediciones, las nadadoras y las notas de este teléfono. No hay deshacer: exporta antes si hay algo que quieras conservar.',
    wipeButton: '🗑 Borrar todo',
    wipeArm: 'Pulsa otra vez para borrar {total} mediciones y {n} nadadoras',
    wipeConfirm: 'Se borran {total} mediciones y {n} nadadoras. ¿Seguro?',

    // LOTE 5 §6, paquete de cumplimiento: "mide y reporta, no diagnostica ni recomienda" del
    // prompt maestro. Cierto sin excepciones desde que asymmetryDiff dejó de calificar la cifra.
    intendedUseNote: 'Esta app mide y registra lo que se le apunta. No diagnostica ni recomienda: las cifras y los avisos (asimetría, umbrales) son descriptivos — la decisión es siempre tuya.',

    deleteAthleteButton: 'Borrar datos',
    deleteAthleteConfirm: 'Se borran {n} mediciones de {code}. Su código queda retirado para siempre, nunca se reutiliza. No hay deshacer: exporta antes si hay algo que quieras conservar. ¿Seguro?',

    storageCorruptBanner: 'El almacenamiento del teléfono estaba dañado: se ha empezado de cero. El original se conserva sin tocar bajo otra clave — avísame antes de seguir.',
    unexportedBanner: '{n} mediciones sin exportar. Comparte el CSV al acabar la sesión.',
    unexportedChangesBanner: 'Hay cambios sin exportar (nota, aparato, intentos o evaluador). Comparte el CSV al acabar la sesión.',
    missingApparatusBanner: 'Falta declarar el aparato de colgada en: {where}. Sin él, esas filas salen con la columna instrumento vacía.',
    orphansBanner: '{n} fila(s) de una prueba que ya no está en el catálogo. Revísalas en Exportar.',
    seasonEndedBanner: 'La temporada terminó el {end}. ¿Borras los datos de la temporada, o prefieres esperar?',
    seasonPurgeButton: 'Borrar datos de la temporada',
    seasonSnoozeButton: 'Recordarlo en 30 días',
    seasonPurgeConfirm: 'Se borran {total} mediciones y {n} nadadoras de la temporada terminada. No hay deshacer: exporta antes si hay algo que quieras conservar. ¿Seguro?',

    saveFailedAlert: 'No se ha podido guardar en el teléfono. Exporta ya el CSV antes de seguir.',
    flagDone: '✓ hecho',
    flagMark: 'marcar',
  },
};
