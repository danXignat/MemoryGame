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
//    { tip: 'text', label }     a highlighted box (label: 'Pont', 'În joc', ...)
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
    title: 'Indicatoarele',
    sign: 'stop',
    pages: [
      [
        { h: 'Înainte să le înveți pe de rost' },
        { p: 'Nu te apuca să tocești indicatoarele unul câte unul. Uită-te întâi la formă și la culoare. De la 50 de metri nu vezi desenul, dar vezi dacă e un triunghi roșu sau un cerc albastru, și deja știi cam ce urmează.' },
        {
          table: [
            ['Ce vezi', 'Ce-ți spune'],
            ['Triunghi cu margine roșie', 'Atenție, urmează ceva: o curbă, copii, o îngustare'],
            ['Octogon roșu, romb galben, triunghi cu vârful în jos', 'Cine trece primul prin intersecție'],
            ['Cerc cu margine roșie', 'Ceva ce nu ai voie să faci'],
            ['Cerc albastru plin', 'Ceva ce trebuie să faci'],
            ['Pătrat sau dreptunghi albastru', 'Doar te informează'],
          ],
        },
        { tip: 'Când semaforul spune una și indicatorul alta, asculți de semafor. Când polițistul spune altceva decât amândouă, asculți de polițist.', label: 'Ordinea' },
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
        { h: 'Cifrele pe care le întreabă la examen' },
        { p: 'Pentru mașină mică, categoria B, dacă nu scrie altceva pe vreun indicator:' },
        {
          table: [
            ['Unde ești', 'Cât poți să mergi'],
            ['În oraș, în sat', '50 km/h'],
            ['Pe drumurile obișnuite din afara localității', '90 km/h'],
            ['Pe drum expres sau pe un național european (E)', '100 km/h'],
            ['Pe autostradă', '130 km/h'],
          ],
        },
        { p: 'Primul an după ce iei permisul ai o regulă în plus: în afara localităților scazi 20 din cifrele de mai sus. Pe un drum de 90 mergi cu maxim 70.' },
      ],
      [
        { h: 'Ce pățești dacă exagerezi' },
        { p: 'Dacă te prinde cu peste 50 km/h mai mult decât limita, rămâi fără permis 90 de zile. Nu contează că drumul era liber și că te grăbeai.' },
        { p: 'Punctele de penalizare se adună de la o amendă la alta. Când ajungi la 15, permisul ți se suspendă pentru 30 de zile.' },
        { h: 'Limita nu e o țintă' },
        { p: 'Pe ploaie, pe ceață, noaptea sau lângă o școală, 50 poate fi prea mult. Mergi cu cât te lasă drumul și vremea, nu cu cât scrie pe stâlp.' },
        { tip: 'În joc, pinul roșu cu aparat foto e un radar. Treci pe lângă el cu viteza legală, altfel în modul Test te costă puncte.', label: 'În joc' },
      ],
    ],
  },
  {
    id: 'prioritate',
    title: 'Cine trece primul',
    sign: 'giveWay',
    pages: [
      [
        { h: 'Pe cine asculți' },
        { p: 'În intersecție pot să-ți spună ce să faci mai multe lucruri deodată. Contează în ordinea asta:' },
        { li: ['polițistul care dirijează', 'semaforul', 'indicatoarele și marcajele', 'regulile generale, cum e prioritatea de dreapta'] },
        { p: 'Deci dacă e roșu și polițistul îți face semn să treci, treci. Pare ciudat prima dată, dar așa e legea.' },
      ],
      [
        { h: 'Intersecția fără nimic' },
        { p: 'Fără semafor, fără indicatoare, fără polițist? Lași să treacă mașina care vine din dreapta ta. Asta e toată regula.' },
        { h: 'Când faci stânga' },
        { p: 'Cei care vin din față și merg drept sau fac dreapta trec înaintea ta. Tu aștepți în mijlocul intersecției, cu roțile drepte, până se face loc.' },
        { tip: 'Dacă ești pe drumul cu romb galben, mașinile de pe străduțele laterale trebuie să te aștepte. În joc le vezi oprite la margine până treci.', label: 'În joc' },
      ],
      [
        { h: 'Sensul giratoriu' },
        { p: 'Când la intrare scrie „Cedează trecerea”, cei care sunt deja în cerc au prioritate. Intri doar când ai loc, ocolești insula prin dreapta și semnalizezi dreapta înainte să ieși.' },
        { h: 'Cui îi faci loc oricum' },
        { li: ['Ambulanței, pompierilor și poliției cu girofar și sirenă. Tragi pe dreapta, iar dacă e nevoie, oprești.', 'Autobuzului care pleacă din stație în oraș și a semnalizat.', 'Pietonului care a pus deja piciorul pe zebra fără semafor.', 'Omului cu baston alb, oriunde ar traversa.', 'Când tramvaiul stă în stație și nu are refugiu, oprești în spatele lui. Lumea coboară direct pe carosabil.'] },
      ],
    ],
  },
  {
    id: 'semafoare',
    title: 'Semafoare și linii pe asfalt',
    sign: 'pedestrian',
    pages: [
      [
        { h: 'Semaforul, pe scurt' },
        {
          table: [
            ['Vezi', 'Faci'],
            ['Verde', 'Treci, dar te uiți după pietoni și după cei care virează'],
            ['Galben fix', 'Oprești. Treci doar dacă ești atât de aproape că o frână ar fi periculoasă'],
            ['Roșu', 'Stai înainte de linie'],
            ['Galben care clipește', 'Semaforul nu dirijează. Te uiți la indicatoare'],
            ['Săgeată verde lângă roșu', 'Poți vira în direcția ei, dar nu ai prioritate'],
          ],
        },
        { tip: 'La săgeata verde cei mai mulți greșesc: cred că au liber. Nu au. Pietonii care traversează și mașinile care au verde trec primele.', label: 'Greșeala clasică' },
      ],
      [
        { h: 'Liniile de pe drum' },
        { p: 'Linia continuă din mijloc nu se calcă. Nici pentru o depășire scurtă, nici ca să întorci.' },
        { p: 'Peste linia întreruptă poți trece, cu semnalizare, ca să depășești sau să schimbi banda.' },
        { p: 'La STOP și la semafor, linia de oprire e locul unde se opresc roțile din față, nu un pic după ea.' },
        { h: 'Calea ferată' },
        { p: 'Lumina roșie care clipește sau bariera lăsată înseamnă că vine trenul. Oprești și aștepți, chiar dacă încă nu-l vezi.' },
      ],
    ],
  },
  {
    id: 'oprire',
    title: 'Depășit, oprit, parcat',
    sign: 'noOvertaking',
    pages: [
      [
        { h: 'Depășirea' },
        { p: 'Depășești pe stânga. Te uiți în oglindă, semnalizezi, treci, apoi revii pe banda ta fără să tai fața celui depășit.' },
        { p: 'Pe dreapta ai voie doar într-o situație: cel din față a semnalizat stânga și s-a tras spre mijloc ca să vireze.' },
        { h: 'Unde nu depășești deloc' },
        { li: ['pe trecerea de pietoni', 'în tunel', 'în curbă sau în vârf de deal, unde nu vezi ce vine', 'unde e indicatorul cu cele două mașini sau linie continuă'] },
        { tip: 'În joc vei da de mașini care merg mai încet decât tine. Poți să rămâi în spatele lor sau să le depășești unde ai voie și nu vine nimic din față.', label: 'În joc' },
      ],
      [
        { h: 'Oprire sau staționare?' },
        { p: 'Diferența e doar de timp. Până în 5 minute e oprire. Peste 5 minute e staționare. Contează, pentru că unele indicatoare interzic una și o lasă pe cealaltă.' },
        { h: 'Unde nu ai voie nici să oprești' },
        { li: ['pe zebra', 'în tunel', 'mai aproape de 25 m de indicatorul stației de autobuz, în fața sau în spatele lui', 'unde e indicatorul „Oprirea interzisă”'] },
        { h: 'Cu spatele, niciodată pe aici' },
        { p: 'Pe autostradă și în intersecții nu mergi cu spatele. Dacă ai ratat ieșirea, mergi până la următoarea.' },
        { tip: 'În parcările de lângă blocuri locurile libere se aprind verde când treci încet pe lângă ele. Intră drept, cu fața sau cu spatele, și oprește în mijlocul locului.', label: 'Exersează' },
      ],
    ],
  },
  {
    id: 'sofer',
    title: 'Tu, mașina și actele',
    sign: 'noEntry',
    pages: [
      [
        { h: 'Înainte să pornești' },
        { p: 'Alcoolul nu se negociază. Nici „doar o bere”, nici „am mâncat bine”. Peste 0,40 mg/l în aerul expirat nu mai e amendă, e dosar penal.' },
        { p: 'Telefonul stă în suport. Vorbești doar prin sistemul „mâini libere”.' },
        { p: 'Centura o pun toți, și cei din spate. Copiii mici stau în scaunul lor, potrivit cu vârsta și cu înălțimea, nu în brațe.' },
      ],
      [
        { h: 'Permisul' },
        { p: 'Pentru categoria B trebuie să ai 18 ani. Permisul îl schimbi o dată la 10 ani.' },
        { p: 'Ți-l pot lua pentru o vreme dacă strângi 15 puncte de penalizare (30 de zile) sau dacă treci cu peste 50 km/h de limită (90 de zile).' },
        { h: 'Iarna' },
        { p: 'Când pe drum e zăpadă, gheață sau polei, cauciucurile de iarnă sunt obligatorii. Nu contează în ce lună e.' },
      ],
    ],
  },
  {
    id: 'accidente',
    title: 'Când ceva merge prost',
    sign: 'narrowRoad',
    pages: [
      [
        { h: 'Ai rămas în pană' },
        { p: 'Pui avariile din prima secundă. Ieși din mașină pe partea dinspre șanț, nu pe cea dinspre trafic, și pui triunghiurile, ca să te vadă cei din spate de departe. Apoi stai în afara drumului, nu lângă mașină.' },
        { h: 'Ajungi la un accident' },
        { p: 'Suni la 112. Le spui unde ești, câți oameni sunt răniți și dacă iese fum. Ajuți dacă știi ce faci, dar fără să te pui și tu în pericol.' },
        { p: 'Dacă ai fost implicat și sunt răniți, nu pleci de acolo.' },
        { tip: 'Pe cineva inconștient nu-l scoți din mașină doar ca să fie scos. Îl miști numai dacă rămânerea acolo e mai periculoasă, de exemplu dacă ia foc mașina.', label: 'Important' },
      ],
    ],
  },
  {
    id: 'preventiv',
    title: 'Cum să nu ai nevoie de capitolul de dinainte',
    sign: 'curveLeft',
    pages: [
      [
        { h: 'Distanța' },
        { p: 'Cu cât mergi mai repede, cu atât lași mai mult loc în față. Pe ud lași și mai mult, pe gheață de câteva ori mai mult.' },
        { h: 'Vremea' },
        { p: 'Pe ceață încetinești, aprinzi faza scurtă și proiectorul de ceață și stai departe de cel din față. Faza lungă nu ajută: lumina se întoarce din ceață direct în ochii tăi.' },
        { p: 'Dacă simți că volanul devine moale pe apă, ai intrat în acvaplanare. Ridici piciorul de pe accelerație și ții volanul drept. Nu frânezi brusc și nu tragi de volan.' },
        { p: 'Noaptea, când vine cineva din față, treci pe faza scurtă. Și tu ai vrea să ți se facă la fel.' },
      ],
      [
        { h: 'Oboseala' },
        { p: 'Geamul deschis și muzica tare nu te trezesc, doar te păcălesc câteva minute. Dacă ți se închid ochii, oprești undeva în siguranță și dormi un sfert de oră.' },
        { h: 'Un plin care ține mai mult' },
        { p: 'Schimbi viteza fără să turezi motorul. Te uiți departe în față, ca să nu frânezi în ultima clipă. Nu lași motorul să meargă degeaba minute întregi la ralanti.' },
        { tip: 'Se vede și în joc: mașina care accelerează brusc și frânează mereu consumă mult mai mult decât una condusă lin.', label: 'În joc' },
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
  if (b.tip) return `<div class="bk-tip"><b>${esc(b.label || 'Pont')}</b> ${md(b.tip)}</div>`;
  if (b.li) return `<ul>${b.li.map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
  if (b.table) return `<table>${b.table.map((r, i) => `<tr>${r.map((c) => (i ? `<td>${md(c)}</td>` : `<th>${md(c)}</th>`)).join('')}</tr>`).join('')}</table>`;
  if (b.signs)
    return `<div class="bk-signs">${b.signs
      .map((k) => `<div class="bk-sign"><img src="${signImg(k, 120)}" alt="" /><div><b>${esc(SIGNS[k].name.ro)}</b><small>${esc(tr(SIGNS[k].rule, 'ro'))}</small></div></div>`)
      .join('')}</div>`;
  return '';
}
