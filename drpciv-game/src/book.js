// ============================================================================
//  book.js  —  "Cartea șoferului": the theory book for the Chestionare
//
//  Chapters of short pages you flip through like a book. At the end of each
//  chapter a button starts a practice test with that chapter's questions
//  (questions.js, field `ch`). Reading progress is remembered on this device.
//
//  Page blocks:
//    { p: 'text' }              a paragraph (**bold** works)
//    { li: ['a', 'b'] }         a list
//    { table: [['a','b'], ...] } a two-column table (first row = header)
//    { tip: 'text' }            a highlighted "remember" box
//    { signs: ['stop', ...] }   sign pictures with their name and rule
//
//  Written for the game from the Romanian traffic rules (OUG 195/2002, HG 1391/2006).
//  Check anything important against the official sources.
// ============================================================================

import { CATEGORIES, SIGNS, tr, visibleSignKeys } from './signs.js';
import { QUESTIONS } from './questions.js';

const signsOf = (cat) => visibleSignKeys().filter((k) => SIGNS[k].category === cat);

export const CHAPTERS = [
  {
    id: 'semne',
    title: 'Indicatoare rutiere',
    sign: 'stop',
    pages: [
      [
        { h: 'Cum recunoști un indicator' },
        { p: 'Forma și culoarea îți spun ce fel de indicator este, chiar înainte să vezi simbolul.' },
        {
          table: [
            ['Formă și culoare', 'Ce înseamnă'],
            ['Triunghi cu chenar roșu', '**Avertizare**: urmează un pericol'],
            ['Octogon roșu, romb galben, triunghi întors', '**Prioritate**: cine trece primul'],
            ['Cerc cu chenar roșu', '**Interzicere / restricție**'],
            ['Cerc albastru', '**Obligare**: așa trebuie să mergi'],
            ['Pătrat sau dreptunghi albastru', '**Informare**'],
          ],
        },
        { tip: 'Semnalele polițistului și semaforul au întâietate față de indicatoare; indicatoarele, față de regulile generale.' },
      ],
      ...['priority', 'warning', 'prohibition', 'mandatory', 'information'].map((cat) => [{ h: CATEGORIES[cat].ro }, { signs: signsOf(cat) }]),
    ],
  },
  {
    id: 'viteza',
    title: 'Viteza',
    sign: 'speed50',
    pages: [
      [
        { h: 'Limitele de viteză (categoria B)' },
        {
          table: [
            ['Unde', 'Maxim'],
            ['În localitate', '50 km/h'],
            ['Alte drumuri din afara localității', '90 km/h'],
            ['Drum expres, drum național european (E)', '100 km/h'],
            ['Autostradă', '130 km/h'],
          ],
        },
        { p: 'Indicatoarele pot coborî sau ridica aceste limite pe anumite porțiuni.' },
        { tip: 'Ai permis de mai puțin de un an? În afara localităților limita ta este cu **20 km/h mai mică**.' },
      ],
      [
        { h: 'Sancțiuni pentru viteză' },
        { li: ['Peste limită cu mai mult de **50 km/h**: permisul se suspendă **90 de zile**.', 'Punctele de penalizare se adună: la **15 puncte** permisul se suspendă **30 de zile**.', 'Radarele fotografiază viteza în dreptul lor; în joc, pinul roșu cu aparat foto.'] },
        { h: 'Viteza potrivită' },
        { p: 'Limita este un maxim, nu o țintă. Pe ploaie, ceață, zăpadă, noaptea sau lângă școli mergi mai încet decât limita.' },
      ],
    ],
  },
  {
    id: 'prioritate',
    title: 'Prioritate în intersecții',
    sign: 'giveWay',
    pages: [
      [
        { h: 'Cine are întâietate' },
        { li: ['1. Semnalele **polițistului**', '2. **Semaforul**', '3. **Indicatoarele** și marcajele', '4. **Regulile** de circulație'] },
        { p: 'Dacă polițistul îți face semn să treci pe roșu, treci: semnalul lui are prioritate.' },
      ],
      [
        { h: 'Intersecții fără semne' },
        { p: 'Ai de acordat prioritate vehiculului care vine **din dreapta** (prioritatea de dreapta).' },
        { h: 'Virajul la stânga' },
        { p: 'Cedezi trecerea vehiculelor din sens opus care merg înainte sau virează la dreapta.' },
        { tip: 'Pe un **drum cu prioritate** (romb galben), mașinile de pe străzile laterale te așteaptă. În joc le vezi oprite la marginea intersecției.' },
      ],
      [
        { h: 'Sensul giratoriu' },
        { li: ['La intrarea marcată cu „Cedează trecerea”, cei care circulă deja în giratoriu au prioritate.', 'Ocolești insula prin dreapta, în sensul săgeților.', 'Semnalizezi **dreapta** înainte de ieșire.'] },
        { h: 'Cui faci loc întotdeauna' },
        { li: ['Ambulanță, pompieri, poliție cu girofar și sirenă: tragi dreapta, oprești dacă e nevoie.', 'În localitate, autobuzului care semnalizează plecarea din stație.', 'Pietonului angajat pe trecerea nesemaforizată și celui cu baston alb.', 'La tramvaiul oprit în stație fără refugiu: oprești în spatele lui.'] },
      ],
    ],
  },
  {
    id: 'semafoare',
    title: 'Semafoare și marcaje',
    sign: 'pedestrian',
    pages: [
      [
        { h: 'Culorile semaforului' },
        {
          table: [
            ['Lumina', 'Ce faci'],
            ['Verde', 'Treci, cu atenție la pietoni și la cei care virează'],
            ['Galben fix', 'Oprești, dacă mai poți opri în siguranță'],
            ['Roșu', 'Oprești înainte de linie'],
            ['Galben intermitent', 'Treci cu atenție, după indicatoare și reguli'],
            ['Săgeată verde lângă roșu', 'Poți vira în direcția ei, dar cedezi trecerea'],
          ],
        },
      ],
      [
        { h: 'Marcaje pe drum' },
        { li: ['**Linia continuă** nu se încalcă și nu se trece peste ea.', '**Linia discontinuă** se poate trece pentru depășire sau schimbarea benzii, cu semnalizare.', 'La **linia de oprire** (STOP sau semafor) oprești înaintea ei.'] },
        { h: 'Trecerea la nivel cu calea ferată' },
        { p: 'Lumina **roșie intermitentă** sau bariera coborâtă înseamnă: oprești, vine trenul.' },
      ],
    ],
  },
  {
    id: 'oprire',
    title: 'Depășire, oprire, staționare',
    sign: 'noOvertaking',
    pages: [
      [
        { h: 'Depășirea' },
        { p: 'Depășești prin **stânga**, după ce te-ai asigurat și ai semnalizat. Pe dreapta depășești numai un vehicul care a semnalizat și s-a deplasat spre stânga ca să vireze.' },
        { h: 'Unde nu ai voie să depășești' },
        { li: ['Pe trecerea pentru pietoni', 'În tunel', 'În curbe și pe vârf de rampă fără vizibilitate', 'Unde e indicatorul „Depășirea interzisă” sau linie continuă'] },
        { tip: 'În joc: în fața ta apar mașini mai lente. Poți sta în coloană în spatele lor sau le poți depăși acolo unde e permis și nu vine nimeni din față.' },
      ],
      [
        { h: 'Oprire și staționare' },
        { table: [['Termen', 'Înseamnă'], ['Oprire', 'Imobilizare de cel mult 5 minute'], ['Staționare', 'Imobilizare de peste 5 minute']] },
        { h: 'Oprirea este interzisă' },
        { li: ['Pe trecerea pentru pietoni', 'În tunel', 'La mai puțin de 25 m înainte și după stația de autobuz', 'Unde există indicatorul „Oprirea interzisă”'] },
        { h: 'Mersul înapoi este interzis' },
        { li: ['Pe autostradă', 'În intersecții'] },
      ],
    ],
  },
  {
    id: 'sofer',
    title: 'Șoferul, alcoolul și documentele',
    sign: 'noEntry',
    pages: [
      [
        { h: 'La volan' },
        { li: ['**Alcool**: nu conduci după ce ai băut. Peste 0,40 mg/l în aerul expirat este infracțiune.', '**Telefonul** se folosește doar cu sistem „mâini libere”.', '**Centura** e obligatorie pentru toți cei din mașină, față și spate.', '**Copiii** călătoresc în scaune potrivite vârstei și înălțimii.'] },
      ],
      [
        { h: 'Permisul' },
        { li: ['Categoria B se poate obține de la **18 ani**.', 'Permisul se preschimbă la **10 ani**.', '**15 puncte** de penalizare = suspendare **30 de zile**.'] },
        { h: 'Mașina' },
        { p: 'Pe drum cu zăpadă, gheață sau polei, **anvelopele de iarnă** sunt obligatorii.' },
      ],
    ],
  },
  {
    id: 'accidente',
    title: 'Pană, accident, prim ajutor',
    sign: 'narrowRoad',
    pages: [
      [
        { h: 'Rămâi în pană' },
        { li: ['Aprinzi **luminile de avarie**.', 'Pui **triunghiurile reflectorizante** ca să fii văzut de departe.', 'Ieși din mașină pe partea dinspre acostament și stai în afara drumului.'] },
        { h: 'La un accident cu răniți' },
        { li: ['Suni la **112**.', 'Acorzi primul ajutor dacă știi, fără să te pui în pericol.', 'Nu pleci de la locul accidentului.'] },
        { tip: 'Victima inconștientă nu se mută din mașină decât dacă e în pericol imediat, de exemplu foc.' },
      ],
    ],
  },
  {
    id: 'preventiv',
    title: 'Conducere preventivă și economică',
    sign: 'curveLeft',
    pages: [
      [
        { h: 'Distanța și vremea' },
        { li: ['Distanța față de cel din față crește cu viteza și pe drum ud sau înghețat.', '**Ceață**: viteză mică, faza scurtă și lumina de ceață, distanță mare. Faza lungă se reflectă și te orbește.', '**Acvaplanare**: ridici piciorul de pe accelerație și ții volanul drept, fără frână bruscă.', '**Noaptea**: la întâlnirea cu alt vehicul treci pe faza scurtă.'] },
      ],
      [
        { h: 'Oboseala' },
        { p: 'Oboseala îți încetinește reacțiile. Singurul remediu sigur este **pauza**: oprești într-un loc sigur și te odihnești.' },
        { h: 'Condus economic' },
        { li: ['Schimbi treptele la turații moderate.', 'Anticipezi traficul ca să nu frânezi brusc.', 'Nu lași motorul mult timp la ralanti.'] },
      ],
    ],
  },
];

export const questionsFor = (chId) => QUESTIONS.filter((q) => q.ch === chId);

/** Render one block to HTML. */
export function blockHTML(b, { signImg, esc }) {
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  if (b.h) return `<h4>${md(b.h)}</h4>`;
  if (b.p) return `<p>${md(b.p)}</p>`;
  if (b.tip) return `<div class="bk-tip"><b>Ține minte</b> ${md(b.tip)}</div>`;
  if (b.li) return `<ul>${b.li.map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
  if (b.table) return `<table>${b.table.map((r, i) => `<tr>${r.map((c) => (i ? `<td>${md(c)}</td>` : `<th>${md(c)}</th>`)).join('')}</tr>`).join('')}</table>`;
  if (b.signs)
    return `<div class="bk-signs">${b.signs
      .map((k) => `<div class="bk-sign"><img src="${signImg(k, 120)}" alt="" /><div><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(tr(SIGNS[k].rule, 'ro'))}</small></div></div>`)
      .join('')}</div>`;
  return '';
}
