// ============================================================================
//  questions.js  —  THEORY QUESTIONS (chestionare, category B)
//
//  Same format as the DRPCIV theory exam: 3 answers (A, B, C), one OR MORE
//  can be correct. The questions are written for this game from the Romanian
//  traffic rules (OUG 195/2002 and HG 1391/2006); they are not copied from the
//  official question bank. Check anything important against drpciv.ro.
//
//  Fields:
//    ch:   the chapter of the theory book it belongs to (see book.js)
//    sign: optional sign key from signs.js (its picture is shown)
//    q:    the question
//    a:    the three answers, in order A, B, C
//    ok:   which answers are correct (0 = A, 1 = B, 2 = C)
//    why:  short explanation shown in practice mode and in the results
// ============================================================================

export const EXAM = { count: 26, passAt: 22, maxWrong: 4, minutes: 30 };

export const QUESTIONS = [
  // ---------------------------------------------------------------- signs
  {
    ch: 'semne',
    sign: 'stop',
    q: 'Ce obligații aveți la întâlnirea acestui indicator?',
    a: ['Să opriți la linia de oprire sau înaintea intersecției', 'Să acordați prioritate vehiculelor care circulă pe drumul în care intrați', 'Să opriți numai dacă vin alte vehicule'],
    ok: [0, 1],
    why: 'La STOP oprești de fiecare dată, chiar și pe un drum gol. Abia apoi te uiți cine vine și lași să treacă.',
  },
  {
    ch: 'semne',
    sign: 'giveWay',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să opriți întotdeauna, chiar dacă drumul este liber', 'Să acordați prioritate vehiculelor care circulă pe drumul în care intrați', 'Să reduceți viteza și, la nevoie, să opriți'],
    ok: [1, 2],
    why: 'Aici nu ești obligat să oprești. Încetinești și oprești doar dacă vine cineva care trebuie lăsat să treacă.',
  },
  {
    ch: 'semne',
    sign: 'priorityRoad',
    q: 'Ce semnifică acest indicator?',
    a: ['Circulați pe un drum cu prioritate', 'Aveți prioritate față de vehiculele care vin de pe drumurile laterale', 'Viteza maximă admisă este de 100 km/h'],
    ok: [0, 1],
    why: 'Rombul galben îți dă prioritate la intersecțiile de pe drumul ăsta. Limita de viteză rămâne cea de dinainte.',
  },
  {
    ch: 'semne',
    sign: 'noOvertaking',
    q: 'Ce interzice acest indicator?',
    a: ['Depășirea autovehiculelor, cu excepția vehiculelor cu două roți fără ataș', 'Doar depășirea camioanelor', 'Circulația autoturismelor'],
    ok: [0],
    why: 'Din dreptul indicatorului nu mai depășești mașini, până la semnul care ridică interdicția.',
  },
  {
    ch: 'semne',
    sign: 'noStopping',
    q: 'Ce interzice acest indicator?',
    a: ['Numai staționarea', 'Oprirea și staționarea', 'Doar oprirea camioanelor'],
    ok: [1],
    why: 'Nu ai voie să oprești deloc. Dacă nici oprirea nu e voie, staționarea cu atât mai puțin.',
  },
  {
    ch: 'semne',
    sign: 'noParking',
    q: 'Unde se află un indicator „Staționarea interzisă”, aveți voie:',
    a: ['Să opriți voluntar pentru cel mult 5 minute', 'Să lăsați mașina parcată peste noapte', 'Să opriți pentru a urca sau coborî un pasager'],
    ok: [0, 2],
    why: 'Poți opri câteva minute, de exemplu să urce cineva. Să lași mașina acolo mai mult de 5 minute nu poți.',
  },
  {
    ch: 'semne',
    sign: 'noEntry',
    q: 'Ce semnifică acest indicator?',
    a: ['Accesul interzis vehiculelor din sensul dumneavoastră de mers', 'Drum cu sens unic pe care puteți intra', 'Puteți intra dacă circulați cu viteză redusă'],
    ok: [0],
    why: 'De obicei e la capătul unei străzi cu sens unic. Din partea ta nu intri.',
  },
  {
    ch: 'semne',
    sign: 'roundabout',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să circulați în sensul indicat de săgeți', 'Să ocoliți insula prin partea stângă', 'Să opriți obligatoriu înainte de intrare'],
    ok: [0],
    why: 'Mergi în sensul săgeților și lași insula în stânga ta, adică o ocolești pe dreapta.',
  },
  {
    ch: 'semne',
    sign: 'children',
    q: 'Ce trebuie să faceți când vedeți acest indicator?',
    a: ['Să reduceți viteza și să fiți pregătit să opriți', 'Să claxonați continuu', 'Să fiți atent la copiii care pot apărea pe carosabil'],
    ok: [0, 2],
    why: 'Urmează o școală sau un loc de joacă. Copiii pot ieși brusc între mașini.',
  },
  {
    ch: 'semne',
    sign: 'pedestrian',
    q: 'Vă apropiați de o trecere pentru pietoni nesemaforizată pe care s-a angajat un pieton. Ce faceți?',
    a: ['Acordați prioritate pietonului', 'Claxonați și treceți înaintea lui', 'Depășiți vehiculul care a oprit în fața trecerii'],
    ok: [0],
    why: 'Pietonul care a pus piciorul pe zebră trece primul. Și nu depășești pe trecere.',
  },
  {
    ch: 'semne',
    sign: 'oneWay',
    q: 'Ce indică acest indicator?',
    a: ['Un drum cu sens unic', 'Un drum pe care puteți întâlni vehicule din sens opus', 'Obligația de a circula numai pe banda din stânga'],
    ok: [0],
    why: 'Pe strada asta toți merg în aceeași direcție. Nu te aștepta să vină cineva din față, dar nici nu întorci.',
  },
  {
    ch: 'semne',
    sign: 'parking',
    q: 'Ce indică acest indicator?',
    a: ['Un loc unde staționarea este permisă', 'Oprirea este interzisă', 'Un spital în apropiere'],
    ok: [0],
    why: 'E un loc amenajat unde poți lăsa mașina.',
  },
  {
    ch: 'semne',
    sign: 'turnRight',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să virați la dreapta', 'Să mergeți înainte', 'Să întoarceți'],
    ok: [0],
    why: 'Cercurile albastre îți spun pe unde trebuie să mergi, nu pe unde poți.',
  },
  {
    ch: 'semne',
    sign: 'curveLeft',
    q: 'Ce faceți când vedeți acest indicator?',
    a: ['Reduceți viteza înainte de curbă', 'Accelerați în curbă', 'Nu depășiți în curbă dacă nu aveți vizibilitate suficientă'],
    ok: [0, 2],
    why: 'Frânezi înainte de curbă, cât ești încă drept. În curba fără vizibilitate nu depășești.',
  },
  {
    ch: 'semne',
    sign: 'narrowRoad',
    q: 'Ce vă avertizează acest indicator?',
    a: ['Drumul se îngustează', 'Începe o autostradă', 'Urmează o trecere la nivel cu calea ferată'],
    ok: [0],
    why: 'Drumul se strâmtează. Încetinești și lași loc celui care vine din față.',
  },

  // ---------------------------------------------------------------- speed
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme în localități, dacă nu există alt indicator?',
    a: ['50 km/h', '60 km/h', '70 km/h'],
    ok: [0],
    why: 'În oraș mergi cu maximum 50, dacă nu scrie altceva pe vreun indicator.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe autostradă?',
    a: ['120 km/h', '130 km/h', '150 km/h'],
    ok: [1],
    why: 'Pe autostradă, cu mașina mică, limita e 130 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe drumurile naționale europene (E), în afara localităților?',
    a: ['90 km/h', '100 km/h', '130 km/h'],
    ok: [1],
    why: 'Pe drum expres și pe un național european (E) limita e 100 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe celelalte drumuri din afara localităților?',
    a: ['80 km/h', '90 km/h', '100 km/h'],
    ok: [1],
    why: 'Pe restul drumurilor din afara localităților mergi cu cel mult 90 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Cu cât este mai mică viteza maximă admisă în afara localităților pentru un șofer cu permis de mai puțin de un an?',
    a: ['10 km/h', '20 km/h', '30 km/h'],
    ok: [1],
    why: 'În primul an de permis scazi 20 km/h din limitele din afara localităților.',
  },
  {
    ch: 'viteza',
    q: 'Ce sancțiune complementară primiți dacă depășiți viteza maximă admisă cu mai mult de 50 km/h?',
    a: ['Suspendarea permisului pentru 30 de zile', 'Suspendarea permisului pentru 90 de zile', 'Doar avertisment'],
    ok: [1],
    why: 'Cu peste 50 km/h peste limită rămâi fără permis 90 de zile.',
  },
  {
    ch: 'viteza',
    q: 'Ce se întâmplă când cumulați 15 puncte de penalizare?',
    a: ['Permisul se suspendă pentru 30 de zile', 'Permisul se anulează definitiv', 'Nu se întâmplă nimic'],
    ok: [0],
    why: 'La 15 puncte adunate îți suspendă permisul pentru 30 de zile.',
  },

  // ---------------------------------------------------------------- priority
  {
    ch: 'prioritate',
    q: 'Într-o intersecție fără semnalizare, cui trebuie să acordați prioritate?',
    a: ['Vehiculului care vine din dreapta', 'Vehiculului care vine din stânga', 'Vehiculului mai mare'],
    ok: [0],
    why: 'Fără semne și fără semafor, lași să treacă mașina din dreapta ta.',
  },
  {
    ch: 'prioritate',
    q: 'Virați la stânga într-o intersecție. Cui acordați prioritate?',
    a: ['Vehiculelor din sens opus care merg înainte', 'Vehiculelor din sens opus care virează la dreapta', 'Nimănui, dacă ați semnalizat'],
    ok: [0, 1],
    why: 'Când faci stânga, îi lași pe cei din față să treacă, fie că merg drept, fie că fac dreapta.',
  },
  {
    ch: 'prioritate',
    q: 'Polițistul vă face semn să treceți, deși semaforul arată roșu. Ce faceți?',
    a: ['Respectați semaforul', 'Respectați semnalul polițistului', 'Opriți și așteptați verdele'],
    ok: [1],
    why: 'Ce arată polițistul contează mai mult decât semaforul și indicatoarele.',
  },
  {
    ch: 'semafoare',
    q: 'Ce semnifică săgeata verde intermitentă montată lângă lumina roșie a semaforului?',
    a: ['Puteți vira în direcția săgeții, acordând prioritate celorlalți participanți la trafic', 'Aveți prioritate față de toți ceilalți', 'Trebuie să așteptați lumina verde'],
    ok: [0],
    why: 'Săgeata verde îți dă voie să virezi, nu îți dă prioritate. Pietonii și cei cu verde trec primii.',
  },
  {
    ch: 'semafoare',
    q: 'Ce semnifică lumina galbenă intermitentă a semaforului?',
    a: ['Circulați cu atenție, respectând indicatoarele și regulile de prioritate', 'Opriți obligatoriu', 'Aveți prioritate față de toți'],
    ok: [0],
    why: 'Semaforul nu dirijează când clipește galben. Treci după indicatoare și după reguli.',
  },
  {
    ch: 'semafoare',
    q: 'Semaforul trece din verde în galben fix. Ce faceți?',
    a: ['Opriți înainte de semafor', 'Treceți dacă sunteți atât de aproape încât nu mai puteți opri în siguranță', 'Accelerați ca să prindeți verdele'],
    ok: [0, 1],
    why: 'Galben fix înseamnă stop. Treci doar dacă ești deja atât de aproape că o frână bruscă ar fi periculoasă.',
  },
  {
    ch: 'prioritate',
    q: 'Vreți să intrați într-un sens giratoriu semnalizat cu „Cedează trecerea”. Cui acordați prioritate?',
    a: ['Vehiculelor care circulă deja în sensul giratoriu', 'Vehiculelor care așteaptă să intre din dreapta', 'Nimănui'],
    ok: [0],
    why: 'Cine e deja în sensul giratoriu are prioritate față de tine, care intri.',
  },
  {
    ch: 'prioritate',
    q: 'Cum ieșiți corect dintr-un sens giratoriu?',
    a: ['Semnalizați la dreapta înainte de ieșire', 'Ieșiți fără să semnalizați', 'Vă asigurați că nu tăiați calea bicicliștilor sau pietonilor'],
    ok: [0, 2],
    why: 'Semnalizezi dreapta înainte de ieșire și te uiți după bicicliști și pietoni.',
  },
  {
    ch: 'prioritate',
    q: 'Într-o localitate, un autobuz semnalizează că pleacă din stație. Ce faceți?',
    a: ['Îi acordați prioritate', 'Accelerați și îl depășiți', 'Claxonați'],
    ok: [0],
    why: 'În oraș, autobuzul care semnalizează că pleacă din stație trebuie lăsat să plece.',
  },
  {
    ch: 'prioritate',
    q: 'Din spate se apropie o ambulanță cu semnale luminoase albastre și sirenă. Ce faceți?',
    a: ['Îi faceți loc să treacă, trăgând spre dreapta', 'Opriți, dacă este nevoie', 'Continuați la fel'],
    ok: [0, 1],
    why: 'Girofarul și sirena înseamnă că îi faci loc, chiar dacă trebuie să oprești.',
  },
  {
    ch: 'prioritate',
    q: 'Un pieton cu baston alb traversează strada. Ce faceți?',
    a: ['Îi acordați prioritate', 'Claxonați ca să grăbească pasul', 'Treceți prin spatele lui fără să încetiniți'],
    ok: [0],
    why: 'Bastonul alb arată că omul nu vede bine. Oprești și îl lași să traverseze în ritmul lui.',
  },
  {
    ch: 'prioritate',
    q: 'Un tramvai este oprit într-o stație fără refugiu pentru pietoni. Ce faceți?',
    a: ['Opriți în spatele tramvaiului cât urcă și coboară călătorii', 'Treceți pe lângă el cu viteză mare', 'Claxonați'],
    ok: [0],
    why: 'Oamenii coboară din tramvai direct pe carosabil, așa că aștepți în spatele lui.',
  },

  // ---------------------------------------------------------------- overtaking, stopping, reversing
  {
    ch: 'oprire',
    q: 'Când puteți depăși pe partea dreaptă?',
    a: ['Când vehiculul din față a semnalizat virajul la stânga și s-a deplasat spre stânga', 'Oricând aveți loc', 'Pe acostament, când e aglomerat'],
    ok: [0],
    why: 'Depășești pe stânga. Pe dreapta doar când cel din față a semnalizat stânga și s-a tras spre mijloc.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzisă depășirea?',
    a: ['Pe trecerea pentru pietoni', 'În tunel', 'Pe un drum drept, cu vizibilitate bună și linie discontinuă'],
    ok: [0, 1],
    why: 'Pe zebră și în tunel nu depășești, nici dacă pare liber.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzis mersul înapoi?',
    a: ['Pe autostradă', 'În intersecții', 'Într-o parcare, cu vizibilitate bună'],
    ok: [0, 1],
    why: 'Cu spatele nu mergi pe autostradă și nici în intersecție.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzisă oprirea voluntară?',
    a: ['Pe trecerea pentru pietoni', 'În tunel', 'Pe un loc de parcare marcat'],
    ok: [0, 1],
    why: 'Pe zebră și în tunel nu ai voie nici măcar să oprești.',
  },
  {
    ch: 'oprire',
    q: 'La ce distanță de indicatorul unei stații de autobuz este interzisă oprirea?',
    a: ['La mai puțin de 10 m înainte și după', 'La mai puțin de 25 m înainte și după', 'La mai puțin de 50 m înainte'],
    ok: [1],
    why: 'Lași liberi câte 25 de metri înainte și după indicatorul stației de autobuz.',
  },
  {
    ch: 'oprire',
    q: 'Cât poate dura cel mult oprirea voluntară a unui vehicul?',
    a: ['5 minute', '10 minute', '15 minute'],
    ok: [0],
    why: 'Până la 5 minute e oprire. Mai mult de atât e staționare.',
  },
  {
    ch: 'semafoare',
    q: 'Ce înseamnă marcajul cu linie continuă din mijlocul drumului?',
    a: ['Nu aveți voie să îl încălcați sau să îl treceți', 'Puteți depăși dacă nu vine nimeni', 'Puteți întoarce peste el'],
    ok: [0],
    why: 'Linia continuă nu se calcă, nici pentru o depășire scurtă.',
  },
  {
    ch: 'oprire',
    q: 'Vreți să schimbați banda. Ce faceți?',
    a: ['Semnalizați din timp', 'Vă uitați în oglinzi și în unghiul mort', 'Schimbați banda brusc, ca să nu pierdeți timp'],
    ok: [0, 1],
    why: 'Te uiți în oglinzi și în unghiul mort, semnalizezi, apoi treci lin pe cealaltă bandă.',
  },

  // ---------------------------------------------------------------- alcohol, phone, belts, documents
  {
    ch: 'sofer',
    q: 'Aveți voie să conduceți după ce ați consumat alcool?',
    a: ['Nu, conducerea sub influența alcoolului este interzisă', 'Da, dacă vă simțiți bine', 'Da, dacă ați băut doar o bere'],
    ok: [0],
    why: 'Nu conduci după ce ai băut. Peste 0,40 mg/l în aerul expirat e deja dosar penal.',
  },
  {
    ch: 'sofer',
    q: 'Cum aveți voie să folosiți telefonul mobil în timpul mersului?',
    a: ['Numai cu un sistem „mâini libere”', 'Ținându-l în mână, dacă vorbiți puțin', 'Ținându-l în mână, la semafor'],
    ok: [0],
    why: 'Telefonul stă în suport. În mână nu îl ții cât conduci.',
  },
  {
    ch: 'sofer',
    q: 'Cine trebuie să poarte centura de siguranță?',
    a: ['Șoferul', 'Pasagerul din față', 'Pasagerii din spate'],
    ok: [0, 1, 2],
    why: 'Centura o pune toată lumea, inclusiv cei din spate.',
  },
  {
    ch: 'sofer',
    q: 'Cum transportați un copil mic într-un autoturism?',
    a: ['Într-un sistem de reținere (scaun pentru copii) potrivit vârstei și înălțimii', 'În brațele unui adult', 'Liber pe bancheta din spate'],
    ok: [0],
    why: 'Copiii mici stau în scaunul lor, potrivit pentru vârstă și înălțime, nu în brațe.',
  },
  {
    ch: 'sofer',
    q: 'Care este vârsta minimă pentru permisul de categoria B?',
    a: ['16 ani', '18 ani', '21 de ani'],
    ok: [1],
    why: 'Permisul de categoria B îl poți lua de la 18 ani.',
  },
  {
    ch: 'sofer',
    q: 'Cât timp este valabil permisul de conducere de categoria B?',
    a: ['5 ani', '10 ani', 'Pe viață'],
    ok: [1],
    why: 'Permisul de categoria B îl schimbi o dată la 10 ani.',
  },
  {
    ch: 'sofer',
    q: 'Când sunt obligatorii anvelopele de iarnă?',
    a: ['Când drumul este acoperit cu zăpadă, gheață sau polei', 'Numai în ianuarie', 'Niciodată'],
    ok: [0],
    why: 'Când e zăpadă, gheață sau polei, cauciucurile de iarnă sunt obligatorii, indiferent de lună.',
  },

  // ---------------------------------------------------------------- breakdowns, accidents, first aid
  {
    ch: 'accidente',
    q: 'Mașina rămâne în pană pe carosabil. Ce faceți?',
    a: ['Aprindeți luminile de avarie', 'Semnalizați vehiculul cu triunghiurile reflectorizante', 'Plecați și lăsați mașina nesemnalizată'],
    ok: [0, 1],
    why: 'Pui avariile și triunghiurile reflectorizante, ca să te vadă cei din spate de departe.',
  },
  {
    ch: 'accidente',
    q: 'Ajungeți primul la un accident cu răniți. Ce faceți?',
    a: ['Sunați la 112', 'Acordați primul ajutor, dacă știți și nu vă puneți în pericol', 'Plecați, ca să nu întârziați'],
    ok: [0, 1],
    why: 'Suni la 112 și ajuți fără să te pui în pericol. De la un accident cu răniți nu pleci.',
  },
  {
    ch: 'accidente',
    q: 'O victimă a unui accident este inconștientă în mașină. Când o scoateți din vehicul?',
    a: ['Numai dacă este în pericol imediat, de exemplu foc', 'Întotdeauna, imediat', 'Niciodată, chiar dacă mașina arde'],
    ok: [0],
    why: 'Dacă o miști, poți agrava rănile. O scoți doar dacă rămânerea acolo e mai periculoasă, de exemplu foc.',
  },

  // ---------------------------------------------------------------- safe and economical driving
  {
    ch: 'preventiv',
    q: 'Simțiți că mașina „plutește” pe apă (acvaplanare). Ce faceți?',
    a: ['Ridicați piciorul de pe accelerație', 'Țineți volanul drept', 'Frânați brusc'],
    ok: [0, 1],
    why: 'Lași accelerația și ții volanul drept. O frână sau un viraj brusc te pot arunca în derapaj.',
  },
  {
    ch: 'preventiv',
    q: 'Cum circulați pe ceață?',
    a: ['Reduceți viteza', 'Folosiți faza lungă', 'Măriți distanța față de vehiculul din față'],
    ok: [0, 2],
    why: 'Pe ceață faza lungă se întoarce în ochii tăi. Folosești faza scurtă și proiectorul de ceață.',
  },
  {
    ch: 'preventiv',
    q: 'Noaptea, cu faza lungă aprinsă, vine un vehicul din sens opus. Ce faceți?',
    a: ['Treceți pe faza scurtă', 'Păstrați faza lungă', 'Stingeți toate luminile'],
    ok: [0],
    why: 'Faza lungă îl orbește pe cel care vine. Treci pe faza scurtă când vă întâlniți.',
  },
  {
    ch: 'preventiv',
    q: 'De ce depinde distanța de siguranță față de vehiculul din față?',
    a: ['De viteză', 'De starea drumului (uscat, ud, înghețat)', 'De culoarea mașinii'],
    ok: [0, 1],
    why: 'Cu cât mergi mai repede și cu cât drumul e mai ud sau mai înghețat, cu atât lași mai mult loc în față.',
  },
  {
    ch: 'preventiv',
    q: 'Vă simțiți obosit la volan. Ce faceți?',
    a: ['Opriți într-un loc sigur și vă odihniți', 'Deschideți geamul și mai conduceți câteva ore', 'Măriți viteza ca să ajungeți mai repede'],
    ok: [0],
    why: 'Oboseala îți încetinește reacțiile. Singurul lucru care ajută cu adevărat e să oprești și să te odihnești.',
  },
  {
    ch: 'preventiv',
    q: 'Ce înseamnă să conduceți economic?',
    a: ['Schimbați treptele de viteză la turații moderate', 'Anticipați traficul ca să evitați frânările bruște', 'Lăsați motorul să meargă mult timp la ralanti'],
    ok: [0, 1],
    why: 'Accelerarea și frânarea lină consumă mai puțin decât smuciturile.',
  },
  {
    ch: 'semafoare',
    q: 'La o trecere la nivel cu calea ferată, lumina roșie clipește. Ce faceți?',
    a: ['Opriți: trecerea este interzisă', 'Treceți repede, dacă nu vedeți trenul', 'Ocoliți bariera'],
    ok: [0],
    why: 'Roșul care clipește anunță că vine trenul. Oprești, chiar dacă încă nu-l vezi.',
  },
];
