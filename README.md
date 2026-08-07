# Dryland test logger

A field sheet for the AQUAMAD dryland test battery, built to be used with one thumb while
twelve swimmers wait. No server, no accounts, no network calls, no dependencies.

## What it does

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
  fecha,atleta,categoria,prueba,metrica,valor,unidad,intentos,evaluador,observaciones
  ```

  One row per measurement, long format. On iOS the export opens the share sheet, which is how
  the file reaches Files → OneDrive. Elsewhere it falls back to a plain download.

## Privacy

Athletes exist as codes (`ATL-01`…). The app has no field for a name and no way to store one.
The code ↔ name map lives on paper, per `frentes/natacion-artistica/privado/LEEME.md`.
Nothing is transmitted: all state sits in `localStorage` on the device until a CSV is exported
by hand.

## Rounding

Enforced on input, per the measurement method: whole centimetres, seconds to one decimal,
degrees snapped to the nearest 5.

## Files

| File | What it is |
|---|---|
| `index.html` | Shell and styles |
| `catalog.js` | Test catalogue: tests, metrics, units, CSV identifiers, rubrics, session blocks |
| `app.js` | Storage, widgets, screens, CSV export |
| `sw.js` | Offline cache. Bump `CACHE` whenever any file changes, or phones keep the old version |
| `manifest.webmanifest`, `icon.svg` | Home-screen install |

The catalogue is the only file that should need editing when a test or a metric changes.
`csv` values inside it are Spanish on purpose: they are written verbatim into a database whose
schema predates this app.

## Running it locally

Any static server works. There is no build step. On this machine, with no Node and no Python
installed, the throwaway PowerShell listener used during development is enough:

```powershell
$root='.'; $l=New-Object System.Net.HttpListener; $l.Prefixes.Add('http://localhost:8765/'); $l.Start()
```

## Deploying

Needs an HTTPS origin for "Add to Home Screen" and for the service worker to register.
GitHub Pages serves that for free **from a public repository**; this app contains no data, so
publishing the code is harmless — but it must be its own repo, not `sistema-claude`, which is
private and holds everything else.

## Known limits

- The iOS share-sheet export path could not be verified on this machine; on desktop Chrome
  `navigator.canShare({files})` is false and the code falls back to a download. Test it on the
  actual iPhone before 2026-09-10.
- Safari can evict a web app's storage. The app nags whenever there are unexported rows; the
  CSV in OneDrive is the real backup, not the phone.
- `icon.svg` only. iOS prefers a PNG `apple-touch-icon`; without it the home-screen icon may
  fall back to a screenshot.
- No editing history: changing a value overwrites it. The exported CSV is the audit trail.
