# DRPCIV Road Signs

A phone-first 2D driving game for learning Romanian road signs. Drive a training track, read what each sign means (Learn mode), then take a scored lap (Test mode).

## Run it with live reload (3 steps)

1. Install Node.js (nodejs.org), open a terminal in this folder and run `npm install` once.
2. Run `npm run dev`. It prints a **Network** address such as `http://192.168.1.20:5173`.
3. Put your phone on the same Wi-Fi and open that address in the phone browser. Every time a file is saved, the phone updates by itself.

Other commands: `npm test` (drives a simulated car around the track and checks the rules) and `npm run artifact` (builds one single page, `dist/artifact.html`).

## Which file to ask for what

| You want to... | File |
| --- | --- |
| Add or edit a road sign (name, rule, look, Test-mode check) | `src/signs.js` |
| Change the road, move signs, add junctions or traffic | `src/map.js` |
| Change car speed, braking, steering, camera, test strictness | `src/config.js` |
| Change driving physics or the Test-mode rules themselves | `src/game.js` |
| Change how the world and cars are drawn | `src/render.js` |
| Change buttons, cards, menus, wording on screen | `src/ui.js`, `src/style.css`, `index.html` |
| Add a new picture on a sign (a new symbol) | `src/signart.js` |

`src/mapbuild.js`, `src/controls.js`, `src/audio.js`, `src/main.js` are plumbing and rarely need changes.

## Notes

- Sign names and rules were written from memory of the Romanian code (OUG 195/2002). Check them against the official manual before the exam.
- Signs are drawn larger than real so they can be read on a phone.
- Some Test-mode checks are game rules (for example, at a pedestrian crossing you must be under 25 km/h) to make "slow down" measurable.
