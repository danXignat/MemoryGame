// ============================================================================
//  signs.js  —  THE ROAD SIGN DATABASE
//
//  To ADD a new sign: copy one block inside SIGNS, give it a new key, change the
//  texts, pick its look in `art` and (optional) its Test-mode rule in `test`.
//  Then place it on the road in map.js (section `signs`).
//
//  Texts are bilingual:  ro = Romanian (official), en = English.
//  NOTE: written from memory of the Romanian traffic code (OUG 195/2002).
//        Before the real exam, double-check wording against the official manual.
//
//  `art`   = how the sign is drawn (see signart.js for shapes & symbols)
//  `test`  = what the game checks in Test mode:
//      stop        full stop before the stop line
//      slow        speed at the line must be <= maxKmh (lineOffset = metres after the sign)
//      speed       speed limit for the stretch ahead (kmh)
//      noOvertake  don't pass the slow car until the "end" sign
//      endOvertake closes the no-overtaking zone (not scored by itself)
//      noStop      don't stand still for `length` metres
//      zones       must (or must not) drive into marked spots (set in map.js)
//      roundabout  drive round counter-clockwise
//      quiz        pop-up question "what does this sign mean?"
// ============================================================================

export const CATEGORIES = {
  warning: {
    ro: 'Avertizare',
    en: 'Warning',
    color: '#e8590c',
  },
  priority: {
    ro: 'Prioritate',
    en: 'Priority',
    color: '#d9a400',
  },
  prohibition: {
    ro: 'Interzicere / Restricție',
    en: 'Prohibition / Restriction',
    color: '#d62828',
  },
  mandatory: {
    ro: 'Obligare',
    en: 'Mandatory',
    color: '#1d6fd1',
  },
  information: {
    ro: 'Informare / Orientare',
    en: 'Information / Direction',
    color: '#2a9d5c',
  },
};

export const SIGNS = {
  // ------------------------------------------------------------------ PRIORITY
  stop: {
    category: 'priority',
    name: { ro: 'Oprire (STOP)', en: 'Stop' },
    rule: {
      ro: 'Oprește complet înainte de linia de oprire, chiar dacă drumul pare liber. Cedează trecerea vehiculelor de pe drumul pe care îl intersectezi și pornești doar când este sigur.',
      en: 'Come to a complete stop at the stop line, even if the road looks empty. Give way to traffic on the road you are joining and go only when it is safe.',
    },
    art: {
      shape: 'octagon',
      fill: '#d62828',
      border: '#ffffff',
      borderW: 0.09,
      symbol: { type: 'text', text: 'STOP', color: '#ffffff', size: 0.5, maxW: 1.45 },
    },
    paint: 'stopLine',
    test: { type: 'stop', lineOffset: 4, lookback: 30 },
  },

  giveWay: {
    category: 'priority',
    name: { ro: 'Cedează trecerea', en: 'Give Way' },
    rule: {
      ro: 'Redu viteza și fii pregătit să oprești. Lasă să treacă vehiculele de pe drumul cu prioritate și oprești doar dacă este necesar.',
      en: 'Slow down and be ready to stop. Let vehicles on the priority road go first, and stop only if you have to.',
    },
    art: { shape: 'triangleDown', fill: '#ffffff', border: '#d62828', borderW: 0.2 },
    paint: 'yieldLine',
    test: { type: 'slow', maxKmh: 25, lineOffset: 12, penalty: 21 },
  },

  priorityRoad: {
    category: 'priority',
    name: { ro: 'Drum cu prioritate', en: 'Priority Road' },
    rule: {
      ro: 'Ai prioritate de trecere în intersecțiile cu drumuri fără prioritate, până la indicatorul „Sfârșitul drumului cu prioritate”. Rămâi totuși atent.',
      en: 'You have right of way at junctions with lesser roads until an “End of priority road” sign. Stay alert anyway.',
    },
    art: { shape: 'diamond', fill: '#f6c90e', border: '#ffffff', borderW: 0.12, outline: '#222222' },
    test: { type: 'quiz' },
  },

  // --------------------------------------------------------------- PROHIBITION
  speed30: {
    category: 'prohibition',
    name: { ro: 'Limită de viteză 30 km/h', en: 'Speed limit 30 km/h' },
    rule: {
      ro: 'Nu depăși 30 km/h pe sectorul de drum care urmează, până la alt indicator de viteză sau de sfârșit de restricție.',
      en: 'Do not exceed 30 km/h on the stretch ahead, until another speed sign or an end-of-restriction sign.',
    },
    art: {
      shape: 'circle',
      fill: '#ffffff',
      border: '#d62828',
      borderW: 0.17,
      symbol: { type: 'text', text: '30', color: '#111111', size: 0.82, maxW: 1.1 },
    },
    test: { type: 'speed', kmh: 30 },
  },

  speed50: {
    category: 'prohibition',
    name: { ro: 'Limită de viteză 50 km/h', en: 'Speed limit 50 km/h' },
    rule: {
      ro: 'Nu depăși 50 km/h pe sectorul de drum care urmează, până la alt indicator de viteză sau de sfârșit de restricție.',
      en: 'Do not exceed 50 km/h on the stretch ahead, until another speed sign or an end-of-restriction sign.',
    },
    art: {
      shape: 'circle',
      fill: '#ffffff',
      border: '#d62828',
      borderW: 0.17,
      symbol: { type: 'text', text: '50', color: '#111111', size: 0.82, maxW: 1.1 },
    },
    test: { type: 'speed', kmh: 50 },
  },

  noOvertaking: {
    category: 'prohibition',
    name: { ro: 'Depășirea interzisă', en: 'No overtaking' },
    rule: {
      ro: 'Este interzis să depășești vehiculele cu motor (cu excepția mopedelor și motocicletelor fără ataș) până la sfârșitul interdicției.',
      en: 'You may not overtake motor vehicles (except mopeds and solo motorcycles) until the end of the restriction.',
    },
    art: {
      shape: 'circle',
      fill: '#ffffff',
      border: '#d62828',
      borderW: 0.17,
      symbol: { type: 'overtake' },
    },
    test: { type: 'noOvertake', startOffset: 8, length: 120 },
  },

  endNoOvertaking: {
    category: 'prohibition',
    name: { ro: 'Sfârșitul interdicției de depășire', en: 'End of no overtaking' },
    rule: {
      ro: 'Interdicția de depășire a încetat. Poți depăși din nou, dacă este permis și sigur.',
      en: 'The overtaking ban is over. You may overtake again, if it is allowed and safe.',
    },
    art: {
      shape: 'circle',
      fill: '#ffffff',
      border: '#4a4f57',
      borderW: 0.05,
      symbol: { type: 'overtake', grey: true },
      cancel: true,
    },
    test: { type: 'endOvertake' },
  },

  noStopping: {
    category: 'prohibition',
    name: { ro: 'Oprirea interzisă', en: 'No stopping' },
    rule: {
      ro: 'Este interzis să oprești voluntar sau să staționezi pe sectorul de drum care urmează, chiar și pentru scurt timp.',
      en: 'You may not stop or park voluntarily on the stretch ahead, not even for a short time.',
    },
    art: {
      shape: 'circle',
      fill: '#1d6fd1',
      border: '#d62828',
      borderW: 0.15,
      symbol: { type: 'cross', color: '#d62828' },
    },
    test: { type: 'noStop', length: 70 },
  },

  noEntry: {
    category: 'prohibition',
    name: { ro: 'Accesul interzis', en: 'No entry' },
    rule: {
      ro: 'Accesul vehiculelor în această direcție este interzis. Nu intra pe acest drum.',
      en: 'Vehicles may not enter in this direction. Do not turn into this road.',
    },
    art: {
      shape: 'circle',
      fill: '#d62828',
      border: '#ffffff',
      borderW: 0.06,
      symbol: { type: 'bar' },
    },
    test: { type: 'zones', expire: 60 },
  },


  noParking: {
    category: 'prohibition',
    name: { ro: 'Staționarea interzisă', en: 'No parking' },
    rule: {
      ro: 'Este interzis să staționezi (să parchezi) pe sectorul care urmează. Oprirea scurtă este permisă.',
      en: 'You may not park on the stretch ahead. A short stop is still allowed.',
    },
    art: { shape: 'circle', fill: '#1d6fd1', border: '#d62828', borderW: 0.15, symbol: { type: 'slash', color: '#d62828' } },
    test: { type: 'quiz' },
  },

  turnLeft: {
    category: 'mandatory',
    name: { ro: 'Direcție obligatorie: la stânga', en: 'Turn left (mandatory)' },
    rule: {
      ro: 'Trebuie să virezi la stânga. Nu poți merge înainte sau la dreapta.',
      en: 'You must turn left. You may not go straight on or turn right.',
    },
    art: { shape: 'circle', fill: '#1d6fd1', border: '#ffffff', borderW: 0.05, symbol: { type: 'arrowLeft' } },
    test: { type: 'zones', expire: 80 },
  },

  curveLeft: {
    category: 'warning',
    name: { ro: 'Curbă periculoasă la stânga', en: 'Dangerous curve to the left' },
    rule: {
      ro: 'Urmează o curbă periculoasă la stânga. Redu viteza înainte de curbă și rămâi pe banda ta.',
      en: 'A dangerous left-hand curve is ahead. Slow down before the curve and stay in your lane.',
    },
    art: { shape: 'triangleUp', fill: '#ffffff', border: '#d62828', borderW: 0.2, symbol: { type: 'curveLeft' } },
    test: { type: 'slow', maxKmh: 40, lineOffset: 30 },
  },

  narrowRoad: {
    category: 'warning',
    name: { ro: 'Drum îngustat', en: 'Narrow road' },
    rule: {
      ro: 'Drumul se îngustează pe ambele sensuri. Redu viteza și fii pregătit să acorzi prioritate vehiculelor din sens opus.',
      en: 'The road narrows on both sides. Slow down and be ready to give way to oncoming vehicles.',
    },
    art: { shape: 'triangleUp', fill: '#ffffff', border: '#d62828', borderW: 0.2, symbol: { type: 'narrow' } },
    test: { type: 'slow', maxKmh: 30, lineOffset: 20 },
  },

  // ----------------------------------------------------------------- MANDATORY
  roundabout: {
    category: 'mandatory',
    name: { ro: 'Sens giratoriu', en: 'Roundabout' },
    rule: {
      ro: 'Circulă prin sensul giratoriu în sens invers acelor de ceasornic. Redu viteza și, dacă intrarea are indicatorul „Cedează trecerea”, acordă prioritate vehiculelor din giratoriu.',
      en: 'Drive round the roundabout counter-clockwise. Slow down and, if the entry has a Give Way sign, let vehicles already in the roundabout go first.',
    },
    art: {
      shape: 'circle',
      fill: '#1d6fd1',
      border: '#ffffff',
      borderW: 0.05,
      symbol: { type: 'roundabout' },
    },
    test: { type: 'roundabout' },
  },

  turnRight: {
    category: 'mandatory',
    name: { ro: 'Direcție obligatorie: la dreapta', en: 'Turn right (mandatory)' },
    rule: {
      ro: 'Trebuie să virezi la dreapta. Nu poți merge înainte sau la stânga.',
      en: 'You must turn right. You may not go straight on or turn left.',
    },
    art: {
      shape: 'circle',
      fill: '#1d6fd1',
      border: '#ffffff',
      borderW: 0.05,
      symbol: { type: 'arrowRight' },
    },
    test: { type: 'zones', expire: 80 },
  },

  // ------------------------------------------------------------------- WARNING
  curveRight: {
    category: 'warning',
    name: { ro: 'Curbă periculoasă la dreapta', en: 'Dangerous curve to the right' },
    rule: {
      ro: 'Urmează o curbă periculoasă la dreapta. Redu viteza înainte de curbă și rămâi pe banda ta.',
      en: 'A dangerous right-hand curve is ahead. Slow down before the curve and stay in your lane.',
    },
    art: { shape: 'triangleUp', fill: '#ffffff', border: '#d62828', borderW: 0.2, symbol: { type: 'curveRight' } },
    test: { type: 'slow', maxKmh: 40, lineOffset: 30 },
  },

  children: {
    category: 'warning',
    name: { ro: 'Copii', en: 'Children' },
    rule: {
      ro: 'Atenție: în apropiere pot fi copii (școală, loc de joacă). Redu viteza și fii pregătit să oprești.',
      en: 'Caution: children may be nearby (school, playground). Slow down and be ready to stop.',
    },
    art: { shape: 'triangleUp', fill: '#ffffff', border: '#d62828', borderW: 0.2, symbol: { type: 'children' } },
    test: { type: 'slow', maxKmh: 30, lineOffset: 14 },
  },

  // --------------------------------------------------------------- INFORMATION
  pedestrian: {
    category: 'information',
    name: { ro: 'Trecere pentru pietoni', en: 'Pedestrian crossing' },
    rule: {
      ro: 'Marchează un loc de traversare pentru pietoni. Redu viteza, fii gata să oprești și acordă prioritate pietonilor angajați în traversare.',
      en: 'Marks a place where pedestrians cross. Slow down, be ready to stop and give way to pedestrians who are crossing.',
    },
    art: {
      shape: 'square',
      fill: '#1d6fd1',
      border: '#ffffff',
      borderW: 0.05,
      symbol: { type: 'pedestrianCrossing' },
    },
    paint: 'crosswalk',
    test: { type: 'slow', maxKmh: 25, lineOffset: 8 },
  },

  oneWay: {
    category: 'information',
    name: { ro: 'Sens unic', en: 'One-way street' },
    rule: {
      ro: 'Circulația pe acest drum se face într-un singur sens, cel indicat de săgeată.',
      en: 'Traffic on this road flows in one direction only, the one shown by the arrow.',
    },
    art: { shape: 'square', fill: '#1d6fd1', border: '#ffffff', borderW: 0.05, symbol: { type: 'arrowUp' } },
    test: { type: 'quiz' },
  },

  parking: {
    category: 'information',
    name: { ro: 'Parcare', en: 'Parking' },
    rule: {
      ro: 'Loc amenajat pentru parcarea vehiculelor.',
      en: 'A place set aside for parking vehicles.',
    },
    art: {
      shape: 'square',
      fill: '#1d6fd1',
      border: '#ffffff',
      borderW: 0.05,
      symbol: { type: 'text', text: 'P', color: '#ffffff', size: 1.35, maxW: 1.2 },
    },
    test: { type: 'quiz' },
  },
};

// Not road signs: used so signalling / pick-up checks can be listed in results.
SIGNS.signalling = {
  hidden: true,
  category: 'mandatory',
  name: { ro: 'Semnalizare', en: 'Signalling' },
  rule: {
    ro: 'Semnalizează din timp, înainte de a vira sau de a schimba banda, și oprește semnalizarea după manevră.',
    en: 'Signal in good time before turning or changing lane, and cancel the signal after the manoeuvre.',
  },
  art: { shape: 'circle', fill: '#1d6fd1', border: '#ffffff', borderW: 0.05, symbol: { type: 'arrowRight' } },
};
SIGNS.pickup = {
  hidden: true,
  category: 'information',
  name: { ro: 'Preluare pasager', en: 'Passenger pick-up' },
  rule: {
    ro: 'Oprește în siguranță, în dreptul locului de întâlnire, pentru a lua pasagerul.',
    en: 'Stop safely at the meeting point to pick up your passenger.',
  },
  art: { shape: 'square', fill: '#2a9d5c', border: '#ffffff', borderW: 0.05, symbol: { type: 'text', text: 'P', color: '#ffffff', size: 1.35, maxW: 1.2 } },
};

/** The signs you can see in the library and quizzes (hides the pseudo-signs). */
export const visibleSignKeys = () => Object.keys(SIGNS).filter((k) => !SIGNS[k].hidden);

/** Handy helper: pick the text in the chosen language. */
export const tr = (obj, lang) => (obj ? obj[lang] ?? obj.en ?? obj.ro ?? '' : '');

// ============================================================================
//  INDICATIONS: what to DO when you meet each sign, what it means legally, and the
//  mix-up that catches people in the DRPCIV exam. Shown on the approach card,
//  in Test mode (with a live status) and in the Sign Library.
//  Written from general knowledge and driving-school guides: check the official text.
// ============================================================================
const IND = (doRo, doEn, legalRo, legalEn, trapRo, trapEn) => ({
  do: { ro: doRo, en: doEn },
  legal: { ro: legalRo, en: legalEn },
  trap: { ro: trapRo, en: trapEn },
});

const INDICATIONS = {
  stop: IND(
    'Oprește complet înainte de linia de oprire, verifică toate direcțiile, semnalizează și pornești doar când e liber.',
    'Full stop before the line, check every direction, signal, then go only when it is clear.',
    'Obligă conducătorul să oprească și să cedeze trecerea vehiculelor de pe drumul pe care intră.',
    'Obliges the driver to stop and give way to traffic on the road being joined.',
    'Nu e suficient să încetinești: oprești la linie, nu după ea, chiar dacă drumul pare gol.',
    'Slowing down is not enough: you stop at the line, not past it, even if the road looks empty.'
  ),
  giveWay: IND(
    'Redu viteza, privește în ambele părți și oprește dacă vine cineva pe drumul cu prioritate.',
    'Slow down, look both ways and stop if anyone is coming on the priority road.',
    'Obligă la cedarea trecerii vehiculelor de pe drumul cu prioritate.',
    'Obliges you to give way to vehicles on the priority road.',
    'Nu înseamnă oprire obligatorie ca la STOP, dar oprești dacă situația din trafic o cere.',
    'It is not a compulsory stop like STOP, but you must stop when the traffic requires it.'
  ),
  priorityRoad: IND(
    'Menține traseul, dar rămâi atent la vehiculele care intră din drumurile laterale.',
    'Keep going, but stay alert for vehicles joining from side roads.',
    'Îți dă prioritate de trecere în intersecțiile următoare, până la indicatorul de sfârșit.',
    'Gives you right of way at the next junctions, until the end-of-priority sign.',
    'Prioritatea ține până la indicatorul de sfârșit, nu pe tot drumul.',
    'The priority lasts until the end sign, not along the whole road.'
  ),
  speed30: IND(
    'Ține viteza sub 30 km/h și evită frânările bruște.',
    'Keep under 30 km/h and avoid harsh braking.',
    'Interzice depășirea vitezei indicate pe sectorul următor.',
    'Forbids exceeding the shown speed on the stretch ahead.',
    'Limita începe la indicator: trebuie să ai deja viteza corectă când treci pe lângă el.',
    'The limit starts at the sign, so you must already be at the right speed when you pass it.'
  ),
  speed50: IND(
    'Ține viteza sub 50 km/h și evită frânările bruște.',
    'Keep under 50 km/h and avoid harsh braking.',
    'Interzice depășirea vitezei indicate pe sectorul următor.',
    'Forbids exceeding the shown speed on the stretch ahead.',
    'Limita începe la indicator: trebuie să ai deja viteza corectă când treci pe lângă el.',
    'The limit starts at the sign, so you must already be at the right speed when you pass it.'
  ),
  noOvertaking: IND(
    'Nu depăși alte vehicule pe sectorul următor. Rămâi în spatele celui mai lent.',
    'Do not overtake other vehicles on the stretch ahead. Stay behind the slower one.',
    'Interzice depășirea vehiculelor cu motor, cu excepția mopedelor și motocicletelor fără ataș.',
    'Forbids overtaking motor vehicles, except mopeds and solo motorcycles.',
    'Interdicția durează până la semnul de sfârșit; nu o încheie o intersecție.',
    'The ban lasts until the end sign; a junction does not cancel it.'
  ),
  endNoOvertaking: IND(
    'Poți depăși din nou, dar doar dacă este sigur și permis.',
    'You may overtake again, but only if it is safe and allowed.',
    'Marchează sfârșitul interdicției de depășire.',
    'Marks the end of the overtaking ban.',
    'Nu înseamnă că depășirea e permisă oricum: verifică marcajul și vizibilitatea.',
    'It does not make overtaking allowed everywhere: check the road markings and visibility.'
  ),
  noStopping: IND(
    'Nu opri și nu staționa pe sector, nici pentru scurt timp.',
    'Do not stop or park on this stretch, not even briefly.',
    'Interzice oprirea voluntară; unde oprirea este interzisă, este interzisă și staționarea.',
    'Forbids voluntary stopping; where stopping is banned, parking is banned too.',
    'Nu o confunda cu Staționarea interzisă, care permite oprirea scurtă.',
    'Do not mix it up with No parking, which still allows a short stop.'
  ),
  noParking: IND(
    'Poți opri scurt (de exemplu pentru urcarea unui pasager), dar nu parca.',
    'You may stop briefly (for example to let a passenger in), but do not park.',
    'Interzice staționarea pe sectorul următor.',
    'Forbids parking on the stretch ahead.',
    'Nu o confunda cu Oprirea interzisă (cu X roșu), care interzice și oprirea.',
    'Do not mix it up with No stopping (red X), which forbids stopping as well.'
  ),
  noEntry: IND(
    'Nu intra pe acest drum. Alege altă cale.',
    'Do not enter this road. Choose another way.',
    'Interzice accesul vehiculelor în această direcție.',
    'Forbids vehicles entering in this direction.',
    'Nu o confunda cu Sens unic: Accesul interzis te oprește să intri, Sens unic doar informează.',
    'Do not mix it up with One-way: No entry stops you entering, One-way only informs.'
  ),
  roundabout: IND(
    'Semnalizează la intrare și la ieșire, circulă în sens invers acelor de ceasornic și cedează cum indică semnele.',
    'Signal in and out, drive counter-clockwise and give way as the signs say.',
    'Obligă la circulația în sens giratoriu, în sens invers acelor de ceasornic.',
    'Obliges you to drive round counter-clockwise.',
    'Cine are prioritate depinde de semnele de la intrare (de exemplu Cedează trecerea), nu doar de sensul giratoriu.',
    'Who has priority depends on the signs at the entry (for example Give Way), not just the roundabout itself.'
  ),
  turnRight: IND(
    'Semnalizează din timp și virează la dreapta. Nu mergi înainte.',
    'Signal early and turn right. Do not go straight on.',
    'Obligă la direcția indicată.',
    'Obliges you to take the direction shown.',
    'Obligă: nu ai voie nici înainte, nici la stânga.',
    'It is an order: no straight on and no left turn.'
  ),
  turnLeft: IND(
    'Semnalizează din timp și virează la stânga. Nu mergi înainte.',
    'Signal early and turn left. Do not go straight on.',
    'Obligă la direcția indicată.',
    'Obliges you to take the direction shown.',
    'Obligă: nu ai voie nici înainte, nici la dreapta.',
    'It is an order: no straight on and no right turn.'
  ),
  curveRight: IND(
    'Redu viteza înainte de curbă, nu în curbă, și rămâi pe banda ta.',
    'Slow down before the curve, not in it, and stay in your lane.',
    'Avertizează asupra unei curbe periculoase la dreapta.',
    'Warns of a dangerous curve to the right.',
    'Frânezi înainte de intrarea în curbă, nu la mijlocul ei.',
    'You brake before entering the curve, not halfway through it.'
  ),
  curveLeft: IND(
    'Redu viteza înainte de curbă, nu în curbă, și rămâi pe banda ta.',
    'Slow down before the curve, not in it, and stay in your lane.',
    'Avertizează asupra unei curbe periculoase la stânga.',
    'Warns of a dangerous curve to the left.',
    'Frânezi înainte de intrarea în curbă, nu la mijlocul ei.',
    'You brake before entering the curve, not halfway through it.'
  ),
  narrowRoad: IND(
    'Redu viteza și fii pregătit să cedezi vehiculelor din sens opus.',
    'Slow down and be ready to give way to oncoming vehicles.',
    'Avertizează că drumul se îngustează.',
    'Warns that the road narrows.',
    'Indicatorul doar avertizează; cine are prioritate decid alte semne.',
    'The sign only warns; other signs decide who has priority.'
  ),
  children: IND(
    'Redu viteza și fii pregătit să oprești.',
    'Slow down and be ready to stop.',
    'Avertizează că pot apărea copii pe carosabil.',
    'Warns that children may be on the road.',
    'Atenția rămâne necesară și în afara orelor de școală.',
    'Stay careful outside school hours too.'
  ),
  pedestrian: IND(
    'Redu viteza și oprește dacă pietonul traversează sau este pe cale să o facă.',
    'Slow down and stop if a pedestrian is crossing or about to cross.',
    'Marchează trecerea pentru pietoni; pietonii angajați au prioritate.',
    'Marks a pedestrian crossing; pedestrians already crossing have priority.',
    'Acorzi prioritate și pietonului care urmează să se angajeze, nu doar celui de pe carosabil.',
    'You also yield to a pedestrian about to step out, not only to one already on the road.'
  ),
  oneWay: IND(
    'Circulă doar în sensul săgeții.',
    'Drive only in the direction of the arrow.',
    'Informează că circulația se face într-un singur sens.',
    'Tells you traffic flows in one direction only.',
    'Nu o confunda cu Accesul interzis (cerc roșu).',
    'Do not mix it up with No entry (red disc).'
  ),
  parking: IND(
    'Poți parca în locul amenajat.',
    'You may park in the marked place.',
    'Indică un loc amenajat pentru parcare.',
    'Shows a place set aside for parking.',
    'Citește panourile adiționale: pot limita timpul sau categoria de vehicule.',
    'Read any plates under it: they can limit time or vehicle type.'
  ),
};
for (const [k, v] of Object.entries(INDICATIONS)) SIGNS[k].ind = v;
