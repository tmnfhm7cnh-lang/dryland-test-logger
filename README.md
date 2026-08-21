# Dryland test logger

A field sheet for the AQUAMAD dryland test battery, built to be used with one thumb while
twelve swimmers wait. No server, no accounts, no network calls, no dependencies.

## What it does

- **Room clock.** A full-screen stopwatch with digits readable across a sports hall, opened from
  the session tab and meant for a second device — the iPad on a bench — that nobody touches. It
  writes nothing. A partner with no device can produce a count and a moment, never a duration, so
  every hold test becomes "read the number when the criterion breaks and call it out", and twelve
  swimmers are measured in two waves instead of twelve turns. Holds a screen wake lock while open.
- Pick a group (Alevín / Infantil / Junior), a date and a session block.
- Each block lists its tests **sorted by fatigue** — mobility → control → strength → power →
  endurance — because measuring mobility after a circuit gives a false number.
- Open a test and you get every athlete in that group with only the fields captured poolside,
  plus a `7/12` counter. The screen is organised **per test, not per athlete**, so it matches
  rotating small groups through one station.
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

The catalogue is the only file that should need editing when a test or a metric changes.
`csv` values inside it are Spanish on purpose: they are written verbatim into a database whose
schema predates this app.

## Running it locally

Any static server works. There is no build step. On this machine, with no Node and no Python
installed, the throwaway PowerShell listener used during development is enough:

```powershell
$root='.'; $l=New-Object System.Net.HttpListener; $l.Prefixes.Add('http://localhost:8765/'); $l.Start()
```

## Tests

Node is installed on this machine since 2026-08-08, so the logic is checked by running it rather
than by reading it. The harness loads the real `app.js` and `catalog.js` into a stub DOM and asserts
the CSV shape, the code ranges and their overflow cases, the apparatus column, the wipe, and that
every screen renders:

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
