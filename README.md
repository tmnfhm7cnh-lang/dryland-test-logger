# Dryland test logger

A field sheet for the AQUAMAD dryland test battery, built to be used with one thumb while
twelve swimmers wait. No server, no accounts, no network calls, no dependencies.

## What it does

- **Room clock.** A full-screen stopwatch with digits readable across a sports hall, opened from
  the session tab and meant for a second device — the iPad on a bench — that nobody touches. It
  writes nothing. A partner with no device can produce a count and a moment, never a duration, so
  every hold test becomes "read the number when the criterion breaks and call it out", and twelve
  swimmers are measured in two waves instead of twelve turns. Holds a screen wake lock while open.
- **Per-field stopwatches, as many at once as there are swimmers holding.** The ⏱ next to any
  seconds field starts its own; starting another does not touch the ones already running, and
  stopping one writes only that one. Until 2026-09-15 there was a single global stopwatch and
  starting a second **stopped the first and committed its value**, which made the "two waves, all
  hold together" protocol impossible to record in the app — with twelve swimmers, that is half a
  session. Any repaint stops them all and commits what they had, because a stopwatch left running
  against a field that has left the screen would write into nothing.
- Pick a group (Alevín / Infantil / Junior), a date and a session block.
- Each block lists its tests **sorted by fatigue** — mobility → control → strength → power →
  endurance — because measuring mobility after a circuit gives a false number.
- Open a test and you get every athlete in that group with only the fields captured poolside,
  plus a `7/12` counter. The screen is organised **per test, not per athlete**, so it matches
  rotating small groups through one station. **Tapping a field never scrolls the screen.** Until
  2026-09-17, every tap re-rendered the whole app and jumped back to the top — harmless with the
  first couple of athletes, but with twelve of them athlete 7 tapping her RPE sent athlete 8 back
  to the top of the list, looking like a missed tap. The jump only belongs to an actual navigation
  (switching tab, block or test); an in-place edit on the same screen keeps the scroll position.
- Video-derived values (My Jump Lab jump height, bridge angles, V angle) are hidden from the
  poolside screens and queue up in the **En casa** tab with a pending badge.
- Export writes a CSV whose header matches the season database that already exists at
  `frentes/natacion-artistica/privado/mediciones-2026-27.csv`:

  ```
  fecha,atleta,categoria,prueba,metrica,valor,unidad,intentos,instrumento,evaluador,observaciones
  ```

  One row per measurement, long format. On iOS the export opens the share sheet, which is how
  the file reaches Files → OneDrive. Elsewhere it falls back to a plain download.

  The export is always the **whole** dataset, header included — never a delta. Saving it twice to
  the same OneDrive folder produces `mediciones-2026-27 1.csv`, ` 2`…; the most recent wins.

  `instrumento` arrived on 2026-08-11 and only applies to tests that declare an `apparatus`
  (today just `elevaciones_colgada`: espaldera in September, possibly barra from October). It is a
  property of the *session*, not of the athlete — one tap covers every swimmer measured that day,
  exactly like the single APARATO field in the header of the paper sheet. The app refuses to stay
  quiet about it: rows saved without an apparatus raise a banner until it is declared.

## Privacy

Athletes exist as codes (`ATL-01`…). The app has no field for a name and no way to store one.
The code ↔ name map lives on paper, per `frentes/natacion-artistica/privado/LEEME.md`.
Nothing is transmitted: all state sits in `localStorage` on the device until a CSV is exported
by hand.

### Codes

Each group owns a reserved range that mirrors the printed field sheets — Alevín `01`–`12`,
Infantil `13`–`22`, Junior `23`–`28` — declared as `start` in `GROUPS`. The app fills a group's
range in order, so the code it hands out matches the paper whichever group is registered first.
Before 2026-08-11 it handed out *highest + 1* globally, which meant registering Junior first gave
those swimmers `ATL-01`… while the sheet in hand said `ATL-23`…

A code is never reused. `codesUsed` keeps every number ever assigned, so a number does not come
back to life when an athlete is removed or an old backup is restored. If a group's range fills up,
the next code lands past every number ever used rather than borrowing the next group's range.

The code says nothing about the group on purpose: swimmers move up a category, so the group lives
in the CSV's `categoria` column, which is allowed to change. The code is the one thing that never does.

## Rounding

Enforced on input, per the measurement method: whole centimetres, seconds to one decimal,
degrees snapped to the nearest 5.

## Files

| File | What it is |
|---|---|
| `index.html` | Shell and styles |
| `catalog.js` | Test catalogue: tests, metrics, units, CSV identifiers, rubrics, session blocks |
| `app.js` | Storage, widgets, screens, CSV export |
| `sw.js` | Offline cache. Bump `CACHE` whenever any file changes, or phones keep the old version. `CORE` must all exist — a missing one fails the install on purpose; `EXTRAS` are added with a `catch` so a missing icon cannot cost the offline mode again |
| `manifest.webmanifest`, `icon.svg`, `icon-180.png` | Home-screen install. iOS only honours a PNG `apple-touch-icon`; the SVG stays for the browser tab and the manifest |
| `tools/test.mjs` | Runs `app.js` and `catalog.js` in Node against a stub DOM |
| `tools/serve.mjs` | Static server, no dependencies, for checking the app in a real browser |

The catalogue is the only file that should need editing when a test or a metric changes.
`csv` values inside it are Spanish on purpose: they are written verbatim into a database whose
schema predates this app.

## Running it locally

Any static server works — there is no build step — but the repository ships one so that a change
can be checked in a real browser and not only against the stub DOM:

```bash
node tools/serve.mjs        # http://localhost:8090, optional port argument
```

The stub in `tools/test.mjs` cannot tell whether a button repaints or a touch lands where it
should; this can. `.claude/launch.json` has it as `dryland-test-logger-preview`.

*(This section used to say the machine had no Node and offered a throwaway PowerShell listener.
Node has been installed since 2026-08-08 — the Tests section below already relied on it.)*

## Tests

Node is installed on this machine since 2026-08-08, so the logic is checked by running it rather
than by reading it. The harness loads the real `app.js` and `catalog.js` into a stub DOM and asserts
the CSV shape, the code ranges and their overflow cases, the apparatus column, the wipe, the
simultaneous stopwatches, and that every screen renders:

```bash
node tools/test.mjs ../../natacion-artistica/privado/mediciones-2026-27.csv
```

The argument is optional; given, it also asserts `CSV_HEADER` still equals the first line of the
schema that owns it. **Run it with the argument whenever that schema changes** — the 2026-08-11
`instrumento` column had already been added to the schema while the app still exported ten columns,
and nothing would have caught it before the day of the baseline test.

## Deploying

Needs an HTTPS origin for "Add to Home Screen" and for the service worker to register.
GitHub Pages serves that for free **from a public repository**; this app contains no data, so
publishing the code is harmless — but it must be its own repo, not `sistema-claude`, which is
private and holds everything else.

## Known limits

- **Stopping a stopwatch does not repaint the screen**, so that athlete's `pendiente` badge and the
  `7/12` counter do not update until something else triggers a render. The value is stored
  correctly — only the indicator lags. Predates the 2026-09-15 stopwatch rewrite.
- ~~The iOS share-sheet export path could not be verified~~ — verified on the iPhone on
  2026-08-10: the share sheet opens and the CSV reaches OneDrive. Watch the destination folder,
  though: the OneDrive extension reopens the last-used location, and the first export landed in the
  app's own source folder instead of `privado/exportaciones-app/`.
- ~~The app worked online only~~ — fixed on 2026-08-21. `icon.svg` was listed in the service
  worker shell and had not existed since 2026-08-07; `cache.addAll()` rejects the whole
  operation on a single 404, so the install never completed. The cache stayed empty and
  `getRegistrations()` returned `[]` — verified in a browser against the deployed origin, four
  days before the app was due to be used in a sports hall. Check 8 in `tools/test.mjs` now
  asserts that every file the app points at exists on disk.
- Safari can evict a web app's storage. The app nags whenever there are unexported rows; the
  CSV in OneDrive is the real backup, not the phone.
- No editing history: changing a value overwrites it. The exported CSV is the audit trail.
