// ============================================================================
//  i18n.js  —  Romanian for the menus and messages
//
//  The screens are written in English in ui.js. When the language is Romanian,
//  every piece of text that matches an entry below is swapped before it is shown.
//  To translate something new: add  'English text': 'Text în română'  below.
// ============================================================================

// whole pieces of text (exact match, after trimming)
const EXACT = {
  // welcome
  'Learn mode': 'Învățare',
  'Signs explain themselves': 'Semnele se explică singure',
  'Test mode': 'Test',
  'Penalty points like the exam': 'Puncte de penalizare, ca la examen',
  'A driving school with 15 levels to learn the Romanian road signs.': 'O școală de șoferi cu 15 niveluri, ca să înveți indicatoarele din România.',
  'Developed by Naty': 'Realizat de Naty',
  'Examenul teoretic DRPCIV': 'Examenul teoretic DRPCIV',
  // menu / settings
  Settings: 'Setări',
  Steering: 'Direcție',
  'Arrows are easier; the wheel is more realistic': 'Săgețile sunt mai ușoare; volanul e mai realist',
  Arrows: 'Săgeți',
  Wheel: 'Volan',
  'Rule language': 'Limba',
  'Sign names show in Romanian and English': 'Numele semnelor apar în română și engleză',
  Conditions: 'Vremea',
  'Night, rain and fog need low beams (L key)': 'Noaptea, pe ploaie și ceață ai nevoie de faza scurtă',
  Day: 'Zi',
  Night: 'Noapte',
  Rain: 'Ploaie',
  Fog: 'Ceață',
  'Test indications': 'Indicații în Test',
  'Show what each sign asks, with live status': 'Arată ce cere fiecare semn, cu starea în timp real',
  Camera: 'Camera',
  Turning: 'Se rotește',
  Fixed: 'Fixă',
  'Sound & vibration': 'Sunet și vibrații',
  'Sound &amp; vibration': 'Sunet și vibrații',
  On: 'Pornit',
  Off: 'Oprit',
  'My Mistakes drill': 'Exersează greșelile',
  'How to play': 'Cum se joacă',
  'Finish test now': 'Termină testul acum',
  Resume: 'Înapoi la joc',
  Learn: 'Învățare',
  // sign library
  'Road Sign Library': 'Indicatoare rutiere',
  'Road sign library': 'Indicatoare rutiere',
  'Search a sign, a rule or an exam trap': 'Caută un semn, o regulă sau o capcană de examen',
  FREE: 'LIBER',
  'No sign matches that search.': 'Niciun semn nu se potrivește.',
  'Check the official text (OUG 195/2002, Annex 2) before relying on this for the exam.': 'Verifică textul oficial (OUG 195/2002, anexa 2) înainte de examen.',
  'Legal meaning': 'Ce spune legea',
  'Common exam trap': 'Capcană la examen',
  'Do now': 'Acum',
  All: 'Toate',
  // quiz and drill
  'What does this sign mean?': 'Ce înseamnă acest indicator?',
  'Correct!': 'Corect!',
  'Not quite': 'Nu chiar',
  'Continue driving': 'Continuă să conduci',
  'My Mistakes': 'Greșelile mele',
  'My mistakes': 'Greșelile mele',
  Done: 'Gata',
  Next: 'Următoarea',
  'See result': 'Vezi rezultatul',
  'Signs you got right are removed from your mistakes list.': 'Semnele la care ai răspuns corect ies din lista de greșeli.',
  'No mistakes saved yet, so this was a random round. Mistakes you make in Test mode show up here.': 'Nu ai încă greșeli salvate, așa că a fost o rundă la întâmplare. Greșelile din modul Test apar aici.',
  // results
  PASSED: 'ADMIS',
  Passed: 'Admis',
  'NOT PASSED': 'RESPINS',
  'Not passed': 'Respins',
  'Ended early': 'Oprit înainte de final',
  'Exam stopped: 21 penalty points reached': 'Examen oprit: ai ajuns la 21 de puncte de penalizare',
  'Next level': 'Nivelul următor',
  'Try again': 'Încearcă din nou',
  'All levels': 'Toate nivelurile',
  'Score by category': 'Scor pe categorii',
  'What to review': 'Ce mai ai de repetat',
  'Nothing to review. Clean run!': 'Nimic de repetat. Traseu perfect!',
  points: 'puncte',
  'penalty / 21': 'penalizare / 21',
  'checks ok': 'verificări corecte',
  time: 'timp',
  Penalty: 'Penalizare',
  'not reached': 'neatins',
  // ending
  'Drive again': 'Condu din nou',
  'RON fuel': 'RON benzină',
  // cars and levels
  'Choose your car': 'Alege mașina',
  Acceleration: 'Accelerație',
  'Top speed': 'Viteză maximă',
  Handling: 'Manevrabilitate',
  Braking: 'Frânare',
  'Fuel economy': 'Consum',
  'Driving school levels': 'Nivelurile școlii de șoferi',
  'Final Boss is locked': 'Final Boss e blocat',
  'Preview it anyway': 'Vezi-l oricum',
  Close: 'Închide',
  'This level is scaffolded (topic, district and conditions are set) but its map and checks are not built yet.': 'Nivelul are tema și cartierul stabilite, dar harta și verificările nu sunt gata încă.',
  // fuel station
  'Filling up…': 'Alimentezi…',
  Stop: 'Oprește',
  'Full tank': 'Plinul',
  // HUD
  checks: 'verificări',
  route: 'traseu',
  Brake: 'Frână',
  reverse: 'înapoi',
  Gas: 'Accel.',
  Reset: 'Reset',
  // cars
  Easy: 'Ușoară',
  Medium: 'Medie',
  Challenging: 'Dificilă',
  'Smooth cruiser. Steady diesel torque, predictable brakes and steering. Forgiving when you are learning.': 'Mașină comodă de drum lung. Motorul diesel trage constant, frânele și direcția sunt previzibile. Iartă greșelile cât înveți.',
  'Light and nimble hatchback. Quick turn-in and easy throttle and brake control. Very beginner friendly.': 'Hatchback ușor și vioi. Intră repede în viraj, iar accelerația și frâna se dozează ușor. Foarte bună pentru începători.',
  'Heavy SUV with lots of torque. It is wide, it keeps rolling, and it needs much earlier braking and turning.': 'SUV greu, cu mult cuplu. E lat, nu se oprește ușor și trebuie să frânezi și să virezi mult mai devreme.',
  'Light, rev-happy compact. Sharp steering and brisk acceleration, but it only wakes up at high revs. Reward it with smooth inputs.': 'Compactă ușoară, căreia îi plac turațiile mari. Direcție precisă și accelerație bună, dar trage abia sus pe turație. Merge cel mai bine condusă lin.',
  'Punchy sport model. A short turbo lag, then a big shove. Firm handling, but speed builds so fast that limits and braking distances need real attention.': 'Versiune sport, cu forță. Turbo-ul întârzie puțin, apoi împinge tare. Ține bine drumul, dar prinde viteză atât de repede încât trebuie să fii atent la limite și la distanța de frânare.',
  'Training town': 'Orașul de antrenament',
  // ending and misc
  'Choose a car': 'Alege mașina',
  'Choose a level': 'Alege nivelul',
  // messages
  'Test restarted': 'Testul a început din nou',
  'Test started': 'Testul a început',
  'Follow the purple route and obey every sign. 21 penalty points means failed.': 'Urmează traseul mov și respectă fiecare semn. La 21 de puncte de penalizare ești respins.',
  'Low fuel': 'Rezervă',
  'Head for the nearest fuel station (green pin on the map).': 'Mergi la cea mai apropiată benzinărie (pinul verde de pe hartă).',
  'Engine stopped': 'Motorul s-a oprit',
  'Out of fuel. Switch on the hazard lights.': 'Ai rămas fără benzină. Pune avariile.',
  'Engine is off.': 'Motorul e oprit.',
  'Speed camera': 'Radar de viteză',
  Police: 'Poliție',
  'Stopped car': 'Mașină oprită',
};

// short phrases that appear inside longer text
const PARTS = [
  ['Locked: pass Level 15', 'Blocat: treci Nivelul 15'],
  ['Coming next', 'Urmează'],
  ['Passed ✓', 'Trecut ✓'],
  [' · Play', ' · Joacă'],
  ['Tank is full.', 'Rezervorul e plin.'],
  ['Start the engine to leave.', 'Pornește motorul ca să pleci.'],
  ['Fuel bay.', 'Locul de alimentare.'],
  ['Switch the engine off with the power button to refuel.', 'Oprește motorul din butonul de pornire ca să alimentezi.'],
  ['Test: follow the purple route. 21 penalty points means failed.', 'Test: urmează traseul mov. La 21 de puncte de penalizare ești respins.'],
  ['Day ·', 'Zi ·'],
  ['Night ·', 'Noapte ·'],
  ['Rain ·', 'Ploaie ·'],
  ['Fog ·', 'Ceață ·'],
  [' · result', ' · rezultat'],
];

const ATTRS = /(aria-label|placeholder|title)="([^"]*)"/g;

/** Translate a piece of HTML (or plain text) to Romanian where we know the words. */
export function toRo(html) {
  if (!html) return html;
  let out = String(html).replace(/>([^<>]+)</g, (m, t) => {
    const k = t.trim();
    if (!k) return m;
    if (EXACT[k]) return m.replace(k, EXACT[k]);
    let r = t;
    for (const [a, b] of PARTS) if (r.includes(a)) r = r.split(a).join(b);
    return `>${r}<`;
  });
  out = out.replace(ATTRS, (m, a, v) => (EXACT[v] ? `${a}="${EXACT[v]}"` : m));
  return out;
}

/** Plain text (no tags). */
export function textRo(t) {
  if (!t) return t;
  if (EXACT[t.trim()]) return EXACT[t.trim()];
  let r = t;
  for (const [a, b] of PARTS) if (r.includes(a)) r = r.split(a).join(b);
  return r;
}

export const HELP_RO = `
  <ol class="howto">
    <li><b>Săgețile</b> sau <b>volanul</b> (stânga jos) virează. Volanul se întoarce singur la mijloc când îl lași.</li>
    <li><b>Accel.</b> și <b>Frână / înapoi</b> sunt pedalele (dreapta jos). Ține frâna apăsată când stai pe loc ca să mergi cu spatele. <b>Reset</b> te pune înapoi pe drum.</li>
    <li><b>Semnalizarea</b> și <b>avariile</b> sunt butoanele de sus. Semnalizează înainte de fiecare viraj; se opresc singure după viraj.</li>
    <li><b>Linia mov</b> și <b>harta rotundă</b> îți arată traseul. Banda de sus îți spune ce urmează.</li>
    <li><b>Învățare</b>: semnele se explică singure. <b>Test</b>: reguli de examen cu puncte de penalizare; la 21 ești respins.</li>
    <li>Noaptea și pe ceață aprinde <b>faza scurtă</b>. La benzinărie: oprești în loc, oprești motorul, alimentezi.</li>
    <li>În parcările de lângă blocuri locurile libere se aprind verde: intră drept și oprește ca să parchezi.</li>
  </ol>
  <p class="empty" style="text-align:left;padding-bottom:0">Tastatură: WASD sau săgeți, Space frână, Q / E semnalizare, H avarii, L lumini, I contact, R reset.</p>`;

// ---------------------------------------------------------------- automatic
//  Watches the page and swaps every known English text for Romanian (and back).
const ATTR_NAMES = ['aria-label', 'placeholder', 'title'];
function fixText(node, ro) {
  const v = node.nodeValue;
  if (!v || !v.trim()) return;
  if (ro) {
    if (node.__ro === v) return; // already ours
    const t = textRo(v);
    if (t !== v) {
      node.__en = v;
      node.__ro = t;
      node.nodeValue = t;
    }
  } else if (node.__en != null && node.__ro === v) {
    node.nodeValue = node.__en;
    node.__ro = null;
  }
}
function fixEl(el, ro) {
  for (const a of ATTR_NAMES) {
    const v = el.getAttribute && el.getAttribute(a);
    if (!v) continue;
    if (ro && EXACT[v]) {
      el['__en_' + a] = v;
      el.setAttribute(a, EXACT[v]);
    } else if (!ro && el['__en_' + a] && el.getAttribute(a) === EXACT[el['__en_' + a]]) el.setAttribute(a, el['__en_' + a]);
  }
}
function walk(root, ro) {
  if (root.nodeType === 3) return fixText(root, ro);
  if (root.nodeType !== 1) return;
  fixEl(root, ro);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) fixText(n, ro);
    else fixEl(n, ro);
    n = tw.nextNode();
  }
}
export function installAutoTranslate(root, isRo) {
  const obs = new MutationObserver((list) => {
    const ro = isRo();
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target, ro);
      else for (const n of m.addedNodes) walk(n, ro);
    }
  });
  obs.observe(root, { childList: true, subtree: true, characterData: true });
  walk(root, isRo());
  return () => walk(root, isRo()); // call after the language changes
}
