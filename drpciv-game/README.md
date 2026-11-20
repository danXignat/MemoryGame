# DRPCIV Road Signs

Car.dat: a landscape-first 2D driving school for learning Romanian road signs. Five cars with different engines, 15 playable driving school levels, Free Roam, Learn mode, exam-style Test mode with penalty points, fuel, headlights, weather and a Final Boss drive (unlocked by passing Level 15).

## Run it with live reload (3 steps)

1. Install Node.js (nodejs.org), open a terminal in this folder and run `npm install` once.
2. Run `npm run dev`. It prints a **Network** address such as `http://192.168.1.20:5173`.
3. Put your phone on the same Wi-Fi, turn it sideways and open that address. Every saved edit updates the phone by itself.

Other commands: `npm test` (simulated drivers play every level and compare the five cars) and `npm run artifact` (builds one single page, `dist/artifact.html`).

## Which file to ask for what

| You want to... | File |
| --- | --- |
| Change a car (power, weight, grip, fuel use) or add one | `src/cars.js` |
| Add or edit a road sign (name, rule, look, Test-mode check) | `src/signs.js` |
| Build or change a level (roads, signs, pedestrians, traffic, weather) | `src/levels.js` |
| Change the free-roam training town | `src/map.js` |
| Tune game feel, fuel, exam penalty points | `src/config.js` |
| Driving physics, fuel, gearbox, exam rules | `src/game.js` |
| How the world, cars, night/rain/fog and minimap are drawn | `src/render.js` |
| Buttons, cards, menus, wording | `src/ui.js`, `src/style.css`, `index.html` |
| Steering wheel and pedal behaviour | `src/controls.js` |

Plumbing that rarely needs changes: `mapbuild.js`, `signart.js` (draws sign pictures), `audio.js`, `storage.js`, `main.js`.

## Photos of the people

Put the photos in `public/assets/` with these names (jpeg, jpg, png or webp), then run `npm run artifact`:

| File | Who |
| --- | --- |
| `naty.jpeg` | Naty, the player and developer (driver avatar) |
| `alisia.jpeg` | Alisia, Naty's girlfriend (right-seat passenger, Final Boss) |
| `dan.jpeg` | Dan, Naty's friend (tips) |
| `petra.jpeg` | Petra, Dan's girlfriend (tips) |

Until a photo is found, a coloured circle with the initial is shown.

## Notes

- The city is stylised. Level names are real Brasov districts, but the maps are not real street layouts.
- Sign texts, the penalty scale (21 points = failed) and car figures were written from general knowledge and driving-school guides. Check them against the official sources before relying on them for the exam.
- Signs are drawn larger than real so they can be read on a phone.
