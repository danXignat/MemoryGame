# Car.dat — full build prompt

Use this prompt to rebuild the whole game from scratch (with an AI coding assistant or a developer).
It describes everything the current game does. Copy it as it is.

---

## 1. The idea

Build **Car.dat**, a mobile-first 2D top-down driving game that teaches the **Romanian road signs and driving rules for the DRPCIV category B exam** (theory and practical). It is played on a phone, held sideways (landscape) or upright (portrait), and is set in **Brașov**.

- Logo: "Car.dat" (blue Škoda Octavia with a chequered flag; file `public/assets/logo.jpg`).
- Developed by **Naty** (the player).
- Language: Romanian and English, switchable everywhere; Romanian by default on Romanian phones.
- The user is not technical: keep the code modular, well commented, and easy to edit file by file.

## 2. People (portraits)

Photos go in `public/assets/` (`naty`, `alisia`, `dan`, `petra` as .jpeg/.jpg/.png/.webp). Until a photo exists, show a coloured circle with the initial.

| Name | Role in the game |
| --- | --- |
| Naty | the player and developer; avatar on the HUD and inside the car (driver seat) |
| Alisia | Naty's girlfriend; passenger in the Final Boss, sits on the right; reacts to bad driving |
| Dan | Naty's friend; gives driving tips at the start of odd levels |
| Petra | Dan's wife; gives tips at the start of even levels |

## 3. Technology

- HTML5 Canvas 2D, plain JavaScript modules, CSS. **Vite** dev server (`npm run dev` = `vite --host`) for live reload on the phone over Wi-Fi.
- Fixed-step physics at 1/120 s; rendering with `requestAnimationFrame`.
- `npm run artifact` builds one self-contained HTML page (esbuild; CSS, JS, logo and photos inlined as data URIs).
- `npm test` runs simulated drivers through every level (Node, no browser).
- Phone apps with **Capacitor 7** (`android/`, `ios/`), app id `ro.cardat.drpciv`, name "Car.dat".

### Files (one job each)

| File | What it holds |
| --- | --- |
| `src/config.js` | every tuning number: car feel, camera, collision, traffic, fuel, exam penalties |
| `src/cars.js` | the 5 cars, power curves, gearbox |
| `src/signs.js` | sign categories, the signs (name, rule, look, exam check), indications "do now / legal meaning / exam trap" (RO + EN) |
| `src/signart.js` | draws sign pictures (canvas) |
| `src/map.js` | Free Roam training town |
| `src/levels.js` | the 15 levels + Final Boss (turtle-style track builder) and the Brașov geography table `GEO` |
| `src/mapbuild.js` | turns a level description into a world: road geometry, signs, tasks, traffic network, side streets, scenery, regions, landmarks |
| `src/game.js` | driving physics, fuel, gearbox, traffic AI, pedestrians, parking, exam rules, passenger, events |
| `src/render.js` + `src/gfx.js` | drawing: roads, 2.5D buildings, trees, cars (sprites), signs, night/rain/fog, minimap |
| `src/ui.js` + `src/i18n.js` | HUD, menus, cards, toasts, results, celebrations, Romanian translation |
| `src/questions.js`, `src/book.js`, `src/theory.js` | theory exam (Chestionare), the theory book, chapter tests |
| `src/controls.js` | arrows / steering wheel, pedals, keyboard |
| `src/audio.js` | synthesised sounds (no files): effects, fanfare, engine |
| `src/storage.js` | saved settings, progress, mistakes |
| `src/portraits.js` | the four people's photos |
| `tests/bot.mjs`, `tests/sim.test.mjs` | simulated drivers and the automatic test suite |
| `scripts/build-artifact.mjs`, `scripts/build-app.mjs` | single-page build; app/web build with manifest and offline cache |

## 4. Controls and HUD

**Steering:** two big arrow buttons (default, easier) or a steering wheel you drag (springs back). Chosen in Settings.
**Pedals:** GAS and BRAKE / REVERSE (hold brake when stopped to reverse). **Reset** puts the car back on the road.
**Keyboard:** WASD/arrows, Space brake, Q/E blinkers, H hazards, L lights, I ignition, R reset.

HUD, kept airy:
- top-left: Naty's avatar, score (+ "Pen x/21" in Test), fuel gauge, level pill "L6 · Calea București ✓ 2/5" (progress), passenger badge;
- top-centre: one slim capsule with left blinker, hazards, right blinker, lights (OFF/LOW/HIGH), engine start/stop;
- top-right: ☰ menu button and a round Waze-style minimap (north-up, blue route);
- purple navigation banner with the next turn ("Peste 70 m virează la stânga — semnalizează");
- bottom: arrows (left), speedometer with gear and rpm arc, pedals (right);
- bottom-centre "dock": the sign indication card, toasts, tips;
- speed-limit badge that blinks when you are over.

Portrait layout: avatar · capsule · menu in one row; score, fuel, level on the left; minimap and limit on the right; arrows bottom-left, speedometer above the pedals bottom-right. Never block the game with a "rotate your phone" screen; show a one-time tip instead.

**Menu (☰):** tiles Car, Level, Signs, Chestionare, Book, Restart; Learn/Test switch; Settings: steering (arrows/wheel), language (RO/EN), weather (day/night/rain/fog), test indications on/off, camera (turning/fixed), sound and vibration; My Mistakes drill; How to play; Finish test now; Resume.

## 5. Cars (engine-based handling)

| Car | Engine | Feel |
| --- | --- | --- |
| Golf 5 | 1.6 FSI, 115 hp petrol | light, nimble, beginner friendly (Easy) |
| Passat B5.5 | 1.9 TDI, 130 hp diesel | smooth, steady torque, forgiving (Easy) |
| Honda Civic | 1.8 i-VTEC, 140 hp | rev-happy, wakes up high in the revs (Medium) |
| Škoda Octavia 2 vRS | 2.0 TFSI, 200 hp turbo | turbo lag then a shove, fast (Challenging) |
| BMW X5 | 3.0d, 218 hp diesel SUV | heavy, wide, long braking, lots of torque (Challenging) |

Each car has mass, power curve by engine type (petrol, diesel, VTEC, turbo with lag), traction, braking, steering speed, tank size and fuel use. Bicycle-model physics, grip-limited steering, automatic 6-speed gearbox with shift times, rpm, idle and redline. Fuel: tank empties with throttle and speed; low-fuel warning at 15 %; out of fuel stalls the engine (switch on hazards).

## 6. Learn mode and Test mode

- **Learn:** drive the route, each sign shows an indication card for about 5 seconds: "Do now" (what to do), "Legal meaning", "Exam trap", with live status (ok / violated). Tap any sign on the road to open its full explanation in the sign library.
- **Test:** exam rules with **DRPCIV-style penalty points; 21 points = failed**. Penalties: STOP not respected 21, no give way 21, pedestrian on crossing not given way 21, hitting a pedestrian or vehicle 21, overtaking where forbidden 21, speeding 5, slow zone 5, no-stopping 5, roundabout 8, mandatory direction 8, no signal 3, lights 3, kerb 1, wrong lane 3, refuel errors 5, hazard stop 5, pickup 8, speeding past a speed camera 5, sign quiz wrong 2.
- Results screen: PASSED / NOT PASSED, points, penalty/21, checks, time, score by sign category, "What to review".
- **My Mistakes drill:** quiz on the signs you got wrong.

## 7. Signs (with Romanian names)

STOP (Oprire), Cedează trecerea, Drum cu prioritate, Limită 30 km/h, Limită 50 km/h, Depășirea interzisă, Sfârșitul interdicției de depășire, Oprirea interzisă, Accesul interzis, Staționarea interzisă, Obligatoriu la stânga, Obligatoriu la dreapta, Curbă periculoasă la stânga, Curbă periculoasă la dreapta, Drum îngustat, Sens giratoriu, Copii, Trecere pentru pietoni, Sens unic, Parcare.
Each sign has: category (warning, priority, prohibition, mandatory, information), Romanian and English name and rule, drawing, exam check type (stop, slow, speed, noOvertake, noStop, zones, roundabout, quiz). Draw signs larger than real so they read on a phone. Tell the user to check texts against OUG 195/2002 and HG 1391/2006.

## 8. Levels (Brașov districts)

Roads are built like turtle graphics: `line`, `turn`, `junction` (90° turn with cross streets), `arm` (side street), `roundabout`, `station` (fuel bay). Signs are placed by `[piece, metres]`.

| Level | District | Topic |
| --- | --- | --- |
| Free Roam | Training town | drive anywhere, meet every sign, refuel |
| L1 | Bartolomeu | first metres: smooth start, steering, braking |
| L2 | Tractorul – Coresi | signalling and mandatory directions |
| L3 | Astra | full STOP with cross traffic |
| L4 | Triaj & Gara Brașov | priority and giving way |
| L5 | Răcădău | pedestrians at crossings |
| L6 | Calea București | 30/50 zones, speed camera, police |
| L7 | Stupini – Rulmentul | no-overtaking zones, slow car |
| L8 | Centrul Vechi (night) | no stopping/parking, hazard lights, fuel station |
| L9 | Sensuri giratorii (rain) | roundabouts: lane, signal in and out, give way |
| L10 | Astra – Noua | several rules in a row |
| L11 | Multi-lane boulevards | signalled lane changes |
| L12 | Schei – Poiana Brașov (fog) | dangerous curves, narrow road, roadworks |
| L13 | Long city route (rain) | priority, bans, pedestrians, refuelling |
| L14 | DRPCIV | mock exam |
| L15 | DRPCIV (night) | final exam; passing unlocks the Final Boss |
| Final Boss | Livada Poștei → Sânpetru | pick up Alisia at Livada Poștei, drive her home to Str. Sfinții Constantin și Elena 41, Sânpetru; then the ending (driving licence card with Naty and Alisia, "Developed by Naty") |

Final Boss passenger flow: a blue stop circle at the pickup; stop, Alisia walks to the car and gets in on the right; she reacts if you brake hard or speed; at her house you stop at the circle, she gets out and walks home.

Every level ends with a **celebration**: confetti, trophy, fanfare, vibration, "Felicitări! Ai completat acest nivel!" / "Congratulations! You completed this level!", level name, time and stats, then buttons (Next level / Try it in Test mode / Play again, or See results in Test). The finish counts as soon as you pass the chequered line, even if you stop right after it.

## 9. Traffic, pedestrians, police, parking

- Oncoming cars in the other lane on every level (not on one-way roads), random colours; every 4th is a **police car** with flashing blue/red light bar.
- **Side streets** on every level (generated on long straights and at junctions). Cars come out of them, **wait for you when you have priority** (hint "Ai prioritate" in Learn), then join your lane or the oncoming lane. At your STOP/give-way junctions they have priority; pulling out in front of a moving car = "you did not give way".
- **Cars in your lane**, slower than the limit (50–70 %), so you **queue** behind them or **overtake** where allowed; they stop at STOP, slow in roundabouts and curves, stop for pedestrians, and turn off into side streets before exam spots (stopped car, refuel, pickup, finish).
- All AI cars keep a gap, look along their own path for you (works in curves), break stand-offs, and never crash into each other.
- Pedestrians cross at zebra crossings (orange ring while waiting); many more people walk on the pavements (never on the road).
- Speed cameras (red pin with a camera icon): photo flash and a message; over the limit costs 5 points in Test.
- **Parking:** car parks next to apartment blocks are drivable; free bays light up green with "P" when you are close and slow; stop straight in a bay (nose first or reversing) for "Parcat corect!" with 1–3 stars. Parked cars are solid.
- Fuel stations: pull into the bay, stop, switch the engine off, refuel (+10 L or full, price 7.6 RON/L), engine on, leave slowly.

## 10. Weather, lights, sound

- Day, night (darkness layer with headlight beams, street-lamp pools, lit windows), rain (streaks), fog (white veil, low beams needed).
- Lights: off / low / high; high beams blind others.
- Synthesised sounds: ticks for blinkers, ok/bad chimes, bump, low fuel, pump, fanfare, and an **engine sound** whose pitch follows the rpm and gets louder on the gas.

## 11. Graphics (professional 2.5D)

- Top-down camera that turns with the car and zooms out with speed; look-ahead.
- Grass with soft light/dark patches; pavements with slab joints, white kerbs, asphalt with white edge lines and dashed centre lines; zebra crossings, stop lines, chequered finish.
- Cars as pre-drawn sprites: metallic paint gradient, windscreen and rear glass with reflection, roof panel, mirrors, soft shadow; headlights, brake lights, blinkers, reverse light drawn live; police livery.
- **2.5D buildings:** walls lean away from the screen centre like a camera looking down. Apartment blocks with a window on every floor (lit at night), parapet, lift rooms; houses with hip roofs, eaves and a chimney; churches with towers and spires; factories with saw-tooth roofs; signs on roofs (CORESI, GARA BRAȘOV, DRPCIV). Cast shadows grow with height.
- Trees as layered crowns (6 tints) on trunks, lifted with height; bushes and flowers; street lamps on poles.
- Keep it fast on phones: sprites made once, no full-screen textures; about 5–10 ms per frame.

## 12. Brașov geography per district

Street layouts stay stylised, but each district has its real scenery:
- Centrul Vechi: old coloured houses wall to wall, **Biserica Neagră**, **Casa Sfatului**, **Muntele Tâmpa** with the white **BRAȘOV** letters.
- Bartolomeu: houses, Biserica Sf. Bartolomeu, Dealul Cetății forest.
- Tractorul – Coresi: new blocks, **Coresi Shopping Resort**, the former Tractorul factory.
- Triaj & Gara: four railway tracks with sleepers and wagons, **Gara Brașov**.
- Răcădău: Masivul Postăvarul and the Tâmpa forest.
- Stupini – Rulmentul: factory halls, Rulmentul, Stupini fields.
- Astra – Noua: **Lacul Noua** (shore, waves, pier, boats), Pădurea Noua.
- Schei – Poiana Brașov: Prima Școală Românească, forest road under Postăvarul.
- DRPCIV levels: the DRPCIV exam building.
- Sânpetru: village houses with gardens and field strips, Dealul Lempeș, the village church; Livada Poștei park.
Place names appear on the map and slide along with the car so you can read them as you pass.

## 13. Theory: Chestionare and the book

- **Chestionare** (DRPCIV format): 26 random questions, 30 minutes, 3 answers each with one or more correct; pass with 22 correct; the 5th wrong answer fails. Buttons "Răspunde mai târziu", "Șterge răspunsul", "Trimite răspunsul"; counters for initial, remaining, correct, wrong, time. Modes: Exam (result at the end) and Practice (correct answers and explanation after each question). Results list your mistakes with explanations. About 60 original questions written from the traffic code (not copied from the official bank), each tagged with a book chapter.
- **No interruptions:** progress saved after every answer (resume after a reload or a call), the clock pauses while the app is in the background, an in-page "leave?" bar instead of browser dialogs, never covered by other screens.
- **Cartea șoferului** (the book): 8 chapters written in a warm, human instructor voice (Indicatoarele, Viteza, Cine trece primul, Semafoare și linii pe asfalt, Depășit oprit parcat, Tu mașina și actele, Când ceva merge prost, Cum să nu ai nevoie de capitolul de dinainte). Paper look, page-flip animation, swipe, remembers your page. Each chapter ends with a chapter test; passing it with 80 % or more marks the lesson solved (✓) with a celebration.

## 14. Languages

All screens in Romanian and English (RO/EN switch on the start screen and in Settings). Romanian comes from a translation table that also catches dynamic text.

## 15. Phone apps

- **Android:** Capacitor project; full screen, screen kept on, vibration; icon and splash from the logo; debug APK via `npm run apk`.
- **iOS:** Capacitor project with Swift Package Manager (no CocoaPods), shared scheme; full screen, status bar hidden, screen kept on.
- **Installable web app:** manifest, icons, offline service worker; open the GitHub Pages link in Safari → Share → Add to Home Screen.
- **GitHub Actions** (`.github/workflows/car-dat-apps.yml`): on each push builds the web app to the `gh-pages` branch, an unsigned iPhone app (`Car.dat-iOS-unsigned.ipa`, install with Sideloadly/AltStore and a free Apple ID) and the Android APK, as downloadable artifacts.

## 16. Quality bar

- A simulated careful driver must finish every level with 0 penalties; a reckless driver must fail the exam; traffic must never deadlock.
- No errors in the browser console; every screen fits on a small landscape phone (667×300), a phone held upright, and a tablet.
- Keep files small and commented so a non-programmer can ask for changes file by file.
