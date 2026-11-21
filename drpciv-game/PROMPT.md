# Car.dat: the build prompt

Hand this to an AI coding assistant or a developer and they can rebuild the game from nothing. It covers everything the game does today. Paste it whole.

---

## 1. What we're building

Car.dat is a 2D driving game seen from above, made for phones. It teaches the Romanian road signs and driving rules you need for the DRPCIV category B exam, both the theory and the driving part. You can hold the phone sideways or upright. The game takes place in Brașov.

- Logo: "Car.dat", a blue Škoda Octavia with a chequered flag (`public/assets/logo.jpg`).
- Made by Naty, who is also the player.
- Romanian and English everywhere, with a switch. Phones set to Romanian start in Romanian.
- The owner doesn't code. Keep the code split into small files with plain comments, so changes can be asked for one file at a time.

## 2. The people

Photos live in `public/assets/` as `naty`, `alisia`, `dan` and `petra` (.jpeg, .jpg, .png or .webp). If a photo is missing, show a coloured circle with the person's initial.

| Name | In the game |
| --- | --- |
| Naty | the player and the developer. Avatar on the HUD and in the driver's seat |
| Alisia | Naty's girlfriend. Rides on the right in the Final Boss and reacts when you drive badly |
| Dan | Naty's friend. Gives a tip at the start of odd levels |
| Petra | Dan's wife. Gives a tip at the start of even levels |

## 3. Tech

- HTML5 Canvas 2D, plain JavaScript modules and CSS. Vite runs the dev server (`npm run dev` is `vite --host`), so edits show up live on a phone on the same Wi-Fi.
- Physics run in fixed steps of 1/120 s. Drawing uses `requestAnimationFrame`.
- `npm run artifact` packs the game into one HTML page with esbuild. CSS, JS, the logo and the photos go inside it as data URIs.
- `npm test` sends simulated drivers through every level, in Node, without a browser.
- The phone apps use Capacitor 7 (`android/`, `ios/`). App id `ro.cardat.drpciv`, name "Car.dat".

### Files

Each file does one job.

| File | Holds |
| --- | --- |
| `src/config.js` | every number you might tune: car feel, camera, collisions, traffic, fuel, exam penalties |
| `src/cars.js` | the five cars, their power curves, the gearbox |
| `src/signs.js` | sign categories and the signs themselves: name, rule, drawing, exam check, and the "do now / what the law says / exam trap" notes in RO and EN |
| `src/signart.js` | draws the sign pictures on canvas |
| `src/map.js` | the Free Roam training town |
| `src/levels.js` | the 15 levels and the Final Boss (built with a turtle-style track builder), plus the `GEO` table of Brașov scenery |
| `src/mapbuild.js` | turns a level description into a world: road shapes, signs, exam tasks, traffic network, side streets, scenery, landmarks |
| `src/game.js` | driving physics, fuel, gearbox, traffic, pedestrians, parking, exam rules, the passenger, game events |
| `src/render.js`, `src/gfx.js` | everything drawn: roads, 2.5D buildings, trees, car sprites, signs, night, rain, fog, the minimap |
| `src/ui.js`, `src/i18n.js` | HUD, menus, cards, messages, results, celebrations, the Romanian translation |
| `src/questions.js`, `src/book.js`, `src/theory.js` | the theory exam (Chestionare), the theory book, chapter tests |
| `src/controls.js` | arrows or steering wheel, pedals, keyboard |
| `src/audio.js` | sounds made in code, no audio files: effects, fanfare, engine |
| `src/storage.js` | saved settings, progress, mistakes |
| `src/portraits.js` | the four photos |
| `tests/bot.mjs`, `tests/sim.test.mjs` | the simulated drivers and the test suite |
| `scripts/build-artifact.mjs`, `scripts/build-app.mjs` | the single-page build, and the app/web build with a manifest and offline cache |

## 4. Controls and HUD

Steering is two big arrow buttons by default, because they're easier. In Settings you can swap them for a wheel you drag; it springs back when you let go.
The pedals are GAS and BRAKE / REVERSE. Hold the brake while stopped and the car backs up. Reset drops the car back on the road.
On a keyboard: WASD or the arrows, Space to brake, Q and E for the blinkers, H for hazards, L for lights, I for the ignition, R to reset.

Keep the HUD light:
- Top left: Naty's avatar, the score ("Pen x/21" next to it in Test), the fuel gauge, the level pill ("L6 · Calea București ✓ 2/5"), and the passenger badge when Alisia is in the car.
- Top centre: one thin bar with the left blinker, hazards, right blinker, lights (OFF/LOW/HIGH) and engine start/stop.
- Top right: the ☰ menu and a round minimap in the style of Waze, with the route in blue.
- Under the top bar: the navigation banner with the next turn ("Peste 70 m virează la stânga, semnalizează").
- Bottom: arrows on the left, speedometer with gear and rev arc, pedals on the right.
- Bottom centre: the sign card, messages and tips.
- A speed-limit badge that blinks when you're over.

Held upright, the avatar, the top bar and the menu share one row. Score, fuel and level sit on the left, the minimap and the limit on the right. Arrows go bottom left, the speedometer sits above the pedals bottom right. Never cover the game with a "turn your phone" screen. Show a short tip once instead.

The ☰ menu has tiles for Car, Level, Signs, Chestionare, Book and Restart, then a Learn/Test switch. Below that: steering (arrows or wheel), language (RO/EN), weather (day, night, rain, fog), test hints on or off, camera (turning or fixed), sound and vibration. At the bottom: My Mistakes drill, How to play, Finish test now, Resume.

## 5. Cars

Each car drives the way its engine pulls.

| Car | Engine | How it drives |
| --- | --- | --- |
| Golf 5 | 1.6 FSI petrol, 115 hp | light and quick to turn, good for beginners (Easy) |
| Passat B5.5 | 1.9 TDI diesel, 130 hp | smooth, steady pull, forgives mistakes (Easy) |
| Honda Civic | 1.8 i-VTEC, 140 hp | loves revs and only wakes up high in the range (Medium) |
| Škoda Octavia 2 vRS | 2.0 TFSI turbo, 200 hp | a short turbo lag, then a big shove (Challenging) |
| BMW X5 | 3.0d diesel SUV, 218 hp | heavy and wide, needs early braking, lots of torque (Challenging) |

Every car has its own mass, power curve (petrol, diesel, VTEC, or turbo with lag), grip, brakes, steering speed, tank and fuel use. The physics use a bicycle model, and steering is limited by grip. The automatic gearbox has six gears with real shift times, revs, idle and a redline. Fuel drains with throttle and speed. A warning comes up at 15 %, and an empty tank stalls the engine (that's when you put the hazards on).

## 6. Learn and Test

- Learn: you drive the route and each sign brings up a card for about five seconds. It says what to do now, what the law says and the usual exam trap, and shows live whether you're getting it right. Tap any sign on the road to open its full page in the sign library.
- Test: exam rules with DRPCIV-style penalty points. 21 points and you fail. The penalties:
  - 21: running a STOP, not giving way, not stopping for a pedestrian on a crossing, hitting a pedestrian or a car, overtaking where it's banned;
  - 8: roundabout mistakes, ignoring a mandatory direction, a missed pickup;
  - 5: speeding, too fast in a slow zone, stopping where it's banned, refuelling wrong, a bad breakdown stop, speeding past a camera;
  - 3: no signal, wrong lights, wrong lane;
  - 2: a wrong answer in a sign quiz;
  - 1: touching the kerb.
- The results screen shows PASSED or NOT PASSED, points, penalty out of 21, checks, time, a score per sign category and a list of what to go over again.
- My Mistakes drill: a quiz built from the signs you got wrong.

## 7. Signs

STOP (Oprire), Cedează trecerea, Drum cu prioritate, Limită 30 km/h, Limită 50 km/h, Depășirea interzisă, Sfârșitul interdicției de depășire, Oprirea interzisă, Accesul interzis, Staționarea interzisă, Obligatoriu la stânga, Obligatoriu la dreapta, Curbă periculoasă la stânga, Curbă periculoasă la dreapta, Drum îngustat, Sens giratoriu, Copii, Trecere pentru pietoni, Sens unic, Parcare.

Every sign has a category (warning, priority, prohibition, mandatory, information), a name and rule in both languages, a drawing, and the kind of exam check it triggers (stop, slow, speed, noOvertake, noStop, zones, roundabout, quiz). Draw the signs bigger than life so they're readable on a phone. Remind the owner to check the wording against OUG 195/2002 and HG 1391/2006.

## 8. Levels

Roads are built like turtle graphics: `line`, `turn`, `junction` (a 90° turn with cross streets), `arm` (a side street), `roundabout`, `station` (a fuel bay). A sign is placed with `[piece, metres]`.

| Level | District | What you practise |
| --- | --- | --- |
| Free Roam | Training town | drive anywhere, meet every sign, refuel |
| L1 | Bartolomeu | the first metres: pulling away, steering, braking |
| L2 | Tractorul – Coresi | signalling and mandatory directions |
| L3 | Astra | a full stop at STOP with cars crossing |
| L4 | Triaj & Gara Brașov | priority and giving way |
| L5 | Răcădău | pedestrians at crossings |
| L6 | Calea București | 30 and 50 zones, a speed camera, police |
| L7 | Stupini – Rulmentul | no-overtaking zones behind a slow car |
| L8 | Centrul Vechi, at night | no stopping or parking, hazard lights, a fuel stop |
| L9 | Sensuri giratorii, in rain | roundabouts: lane, signal in and out, give way |
| L10 | Astra – Noua | several rules back to back |
| L11 | Boulevards with several lanes | signalled lane changes |
| L12 | Schei – Poiana Brașov, in fog | sharp bends, a narrow road, roadworks |
| L13 | A long city drive, in rain | priority, bans, pedestrians, refuelling |
| L14 | DRPCIV | a mock exam |
| L15 | DRPCIV, at night | the final exam. Pass it to unlock the Final Boss |
| Final Boss | Livada Poștei → Sânpetru | pick Alisia up at Livada Poștei and drive her home to Str. Sfinții Constantin și Elena 41, Sânpetru. The ending is a driving licence card with Naty and Alisia and "Developed by Naty" |

In the Final Boss a blue circle marks the pickup. You stop there, Alisia walks over and gets in on the right. She reacts if you brake hard or speed. At her house you stop in the circle, she gets out and walks to her door.

Every level ends with a small party: confetti, a trophy, a fanfare and a buzz of the phone. The text reads "Felicitări! Ai completat acest nivel!" or "Congratulations! You completed this level!", with the level name, your time and stats. Then the buttons: next level, try it in Test, play again (in Test, a button to the results). The level counts as done the moment you cross the chequered line, even if you stop right after it.

## 9. Traffic, pedestrians, police, parking

- Cars come the other way on every level except one-way roads, in random colours. Every fourth one is a police car with a flashing blue and red light bar.
- Every level has side streets, placed on long straights and at junctions. Cars pull out of them. If you have priority they wait for you (in Learn a hint says "Ai prioritate"), then they join your lane or the other one. At your own STOP or give-way they have priority. Pulling out in front of a car that is still coming towards the junction counts as not giving way; one that has already gone through and is driving away doesn't.
- Some cars drive in your lane at 50–70 % of the limit, so you either queue behind them or overtake where it's allowed. They stop at STOP, slow down in roundabouts and bends, wait for pedestrians, and turn off into a side street before the spots the exam needs clear (a stopped car, the fuel stop, the pickup, the finish).
- Computer cars keep their distance, check their own path for you (so it works in bends), sort out stand-offs and never crash into each other.
- Pedestrians cross at zebra crossings, with an orange ring around them while they wait. Plenty more walk along the pavements and never step onto the road.
- Speed cameras show as a red pin with a camera on it. Driving past gives a flash and a message. Over the limit costs 5 points in Test.
- Parking: the car parks next to the blocks of flats are drivable. Free bays glow green with a "P" when you're close and slow. Stop straight in one, nose in or reversing, and you get "Parcat corect!" with one to three stars. Parked cars are solid.
- Fuel stations: pull into the bay, stop, switch the engine off and fill up (10 L or a full tank, 7.6 RON per litre). Then start the engine and leave slowly.

## 10. Weather, lights, sound

- Day, night, rain and fog. Night is a dark layer with holes for your headlights, the pools of the street lamps and lit windows. Rain falls in streaks. Fog is a white veil and needs low beams.
- Lights go off, low, high. High beams dazzle drivers coming the other way.
- All sounds are made in code: blinker ticks, an ok chime and a wrong chime, bumps, the low-fuel warning, the fuel pump, a fanfare, and an engine whose pitch follows the revs and gets louder when you press the gas.

## 11. Graphics

- The camera looks straight down, turns with the car, zooms out as you speed up and looks a little ahead.
- Grass has soft light and dark patches. Pavements have slab joints and white kerbs. Asphalt has white edge lines and a dashed centre line. Zebra crossings, stop lines and a chequered finish line.
- Cars are drawn once as sprites: metallic paint, windscreen and rear glass with a reflection, roof, mirrors and a soft shadow. Headlights, brake lights, blinkers and the reversing light are drawn live on top. Police cars get their own livery.
- Buildings are 2.5D: their walls lean away from the centre of the screen, as if a camera were looking down. Blocks of flats have a window on every floor (some lit at night), a parapet and lift rooms. Houses have hipped roofs, eaves and a chimney. Churches have towers and spires. Factories have saw-tooth roofs. Some roofs carry a name: CORESI, GARA BRAȘOV, DRPCIV. Taller buildings throw longer shadows.
- Blocks of flats look like real Romanian blocks: a pastel render (sand, dusty pink, pale blue, greenish white, off-white, clay) with a coloured stairwell strip, a dark entrance door at the foot of each stairwell, balconies on some, and a darker foot on every wall so they sit on the ground. The wall lean is strong enough to read as depth.
- The scene has atmosphere: a pale haze toward the far edge of the screen, a warm light from the top left and a soft vignette that pulls the eye to the car. All of it is one image made once per screen size.
- No emoji anywhere in the interface. The trophy, the book and the parking stars are drawn icons.
- Trees are layered crowns in six shades of green on visible trunks, and they lean with height too. Add bushes, flowers and street lamps on poles.
- It has to stay quick on a phone: draw sprites once, no textures over the whole screen, around 5–10 ms per frame.

### Game feel

- Hard braking at speed leaves skid marks that fade over about 14 seconds and puffs a little tyre smoke, with a tyre squeal made in code. A crash throws sparks from the front and shakes the camera with a smooth wobble that dies out, not random jitter.
- A real exam mistake (5 points or more) flashes the screen edges red once, plays a low buzz and vibrates longer. Small mistakes keep the soft chime.
- Cards, messages, the navigation banner and menus slide or spring in with ease-out curves. The speed-limit badge pulses when you're over instead of blinking. All of it switches off for people who ask their phone for reduced motion.
- Parking: when you line up with a free bay, four corner brackets close in on it and turn white, then amber, then green as you get straighter. A park-assist sensor looks only ahead and behind, shows green/amber/red arcs at the bumpers and beeps faster as the gap shrinks (a steady tone under 30 cm). Parking well gives a handbrake click and a short chime, a green ring that grows out of the bay, a burst of sparkles and stars that pop in one by one.
- Interface: the score and penalty counters roll to their new value and pop when they go up. The fuel bar slides. Menu tiles cascade in. Switches fade between states. Lights and hazards click; the engine button plays a starter crank.
- Every sign you pass in Test answers back: a green tick or a red cross pops onto its corner with a little spring, floats up and fades.
- Chestionare: a wrong pick shakes "no", the right answer gives one soft green pulse. Book pages make a paper sound when they turn. Rain has its own quiet sound under the engine.
- Particles and skid marks live in fixed-size pools, so nothing new is created while the game runs.

### Look and feel

- Colours: graphite HUD panels with 1px hairlines. One navigation blue for the route and for whatever is selected. Amber only for things that blink. Green and red only for right and wrong. No violet, no neon glow.
- Type: Barlow Condensed for headings and every number, with tabular figures so scores, speed and timers don't jump around. Inter for body text. Details are smaller and lighter than titles.
- Shape: small corner radii (8–14px). Hairlines and slight changes in brightness instead of heavy shadows. Lists are rows with dividers, not stacks of cards.
- Touch: a pressed button gets brighter and gains a sharp edge, but never changes size. HUD text can't be selected by accident. Respect the safe areas and keep to an 8px grid.
- Car picker and sign library: hairline cards. The chosen car gets a blue edge, the stats are thin segments, the sign's category is a thin coloured rule on top. Engine data reads in Romanian (CP benzină, CP diesel).
- Results: one verdict (ADMIS or RESPINS). Stats sit between hairlines. Category bars are coloured by how you did (green when full, amber around half, red when low), with the category's own colour as a small dot.

## 12. Brașov, district by district

The streets are made up, but the scenery of each district is real:
- Centrul Vechi: old coloured houses wall to wall, Biserica Neagră, Casa Sfatului, and Tâmpa with the white BRAȘOV letters.
- Bartolomeu: houses, the Sf. Bartolomeu church, the forest on Dealul Cetății.
- Tractorul – Coresi: new blocks, Coresi Shopping Resort, the old Tractorul factory.
- Triaj and the station: four railway tracks with sleepers and wagons, Gara Brașov.
- Răcădău: Postăvarul and the woods of Tâmpa.
- Stupini – Rulmentul: factory halls, Rulmentul, the Stupini fields.
- Astra – Noua: Lacul Noua with its shore, waves, a pier and boats, and the Noua forest.
- Schei – Poiana Brașov: Prima Școală Românească, then a forest road under Postăvarul.
- The DRPCIV levels: the DRPCIV exam building.
- Sânpetru: village houses with gardens and strips of field, Dealul Lempeș, the village church, and the Livada Poștei park where the Final Boss starts.

Place names are written on the map and slide along beside the car, so you can read them as you drive past.

## 13. Theory: Chestionare and the book

- Chestionare follows the DRPCIV format: 26 random questions in 30 minutes, three answers each, one or more of them right. 22 correct answers and you pass; the fifth wrong one ends it. The buttons are "Răspunde mai târziu", "Șterge răspunsul" and "Trimite răspunsul". Counters show how many you started with, how many are left, right, wrong, and the time. You can take it as an exam (result at the end) or as practice (the right answer and a short explanation after each question). The results list your mistakes with explanations. The questions keep the formal exam wording ("dumneavoastră"), but every explanation talks like the book's instructor, in plain "tu" Romanian. There are about 60 questions, written from the traffic code rather than copied from the official bank, and each one belongs to a chapter of the book.
- Nothing should interrupt it. Every answer is saved, so you can carry on after a reload or a phone call. The clock stops while the app is in the background. Leaving asks you on the page itself, not with a browser dialog. No other screen ever covers it.
- Cartea șoferului, the book, has eight chapters written the way a friendly instructor talks: Indicatoarele, Viteza, Cine trece primul, Semafoare și linii pe asfalt, Depășit, oprit, parcat, Tu, mașina și actele, Când ceva merge prost, and Cum să nu ai nevoie de capitolul de dinainte. It looks like paper, pages flip with an animation or a swipe, and it remembers where you stopped. Each chapter ends with a short test. Score 80 % or more and the lesson gets a ✓ and a small celebration.

## 14. Languages

Every screen works in Romanian and English. The RO/EN switch is on the start screen and in Settings. The Romanian comes from a translation table that also catches text the game builds on the fly.

## 15. Phone apps

- Android: a Capacitor project. Full screen, the screen stays on, vibration works, and the icon and splash come from the logo. `npm run apk` builds a debug APK.
- iOS: a Capacitor project using Swift Package Manager (no CocoaPods) with a shared scheme. Full screen, status bar hidden, the screen stays on.
- Web app you can install: a manifest, icons and an offline service worker. Open the GitHub Pages link in Safari, then Share, then Add to Home Screen.
- GitHub Actions (`.github/workflows/car-dat-apps.yml`) runs on every push. It publishes the web app to the `gh-pages` branch and builds an unsigned iPhone app (`Car.dat-iOS-unsigned.ipa`, which you install with Sideloadly or AltStore and a free Apple ID) and the Android APK, both ready to download.

## 16. When is it good enough

- A careful simulated driver finishes every level with 0 penalty points. A reckless one fails the exam. Traffic never gets stuck.
- The browser console stays free of errors. Every screen fits on a small phone held sideways (667×300), on a phone held upright and on a tablet.
- Files stay small and commented, so someone who doesn't code can ask for changes one file at a time.
