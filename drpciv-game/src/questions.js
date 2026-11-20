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
    why: 'La STOP oprirea este obligatorie de fiecare dată, chiar dacă nu vine nimeni, apoi acordați prioritate.',
  },
  {
    ch: 'semne',
    sign: 'giveWay',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să opriți întotdeauna, chiar dacă drumul este liber', 'Să acordați prioritate vehiculelor care circulă pe drumul în care intrați', 'Să reduceți viteza și, la nevoie, să opriți'],
    ok: [1, 2],
    why: '„Cedează trecerea” nu cere oprire obligatorie: reduceți viteza și opriți doar dacă trebuie să lăsați pe cineva să treacă.',
  },
  {
    ch: 'semne',
    sign: 'priorityRoad',
    q: 'Ce semnifică acest indicator?',
    a: ['Circulați pe un drum cu prioritate', 'Aveți prioritate față de vehiculele care vin de pe drumurile laterale', 'Viteza maximă admisă este de 100 km/h'],
    ok: [0, 1],
    why: 'Drumul cu prioritate vă dă prioritate la intersecțiile de pe traseu; nu schimbă limita de viteză.',
  },
  {
    ch: 'semne',
    sign: 'noOvertaking',
    q: 'Ce interzice acest indicator?',
    a: ['Depășirea autovehiculelor, cu excepția vehiculelor cu două roți fără ataș', 'Doar depășirea camioanelor', 'Circulația autoturismelor'],
    ok: [0],
    why: 'Depășirea autovehiculelor este interzisă de la indicator până la sfârșitul restricției.',
  },
  {
    ch: 'semne',
    sign: 'noStopping',
    q: 'Ce interzice acest indicator?',
    a: ['Numai staționarea', 'Oprirea și staționarea', 'Doar oprirea camioanelor'],
    ok: [1],
    why: '„Oprirea interzisă” interzice orice imobilizare voluntară, deci și staționarea.',
  },
  {
    ch: 'semne',
    sign: 'noParking',
    q: 'Unde se află un indicator „Staționarea interzisă”, aveți voie:',
    a: ['Să opriți voluntar pentru cel mult 5 minute', 'Să lăsați mașina parcată peste noapte', 'Să opriți pentru a urca sau coborî un pasager'],
    ok: [0, 2],
    why: 'Oprirea (până la 5 minute) este permisă; staționarea (peste 5 minute) nu.',
  },
  {
    ch: 'semne',
    sign: 'noEntry',
    q: 'Ce semnifică acest indicator?',
    a: ['Accesul interzis vehiculelor din sensul dumneavoastră de mers', 'Drum cu sens unic pe care puteți intra', 'Puteți intra dacă circulați cu viteză redusă'],
    ok: [0],
    why: 'Indicatorul se pune de obicei la capătul unui drum cu sens unic: din această parte nu aveți voie să intrați.',
  },
  {
    ch: 'semne',
    sign: 'roundabout',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să circulați în sensul indicat de săgeți', 'Să ocoliți insula prin partea stângă', 'Să opriți obligatoriu înainte de intrare'],
    ok: [0],
    why: 'Circulația în sens giratoriu se face în sensul săgeților, ocolind insula prin dreapta.',
  },
  {
    ch: 'semne',
    sign: 'children',
    q: 'Ce trebuie să faceți când vedeți acest indicator?',
    a: ['Să reduceți viteza și să fiți pregătit să opriți', 'Să claxonați continuu', 'Să fiți atent la copiii care pot apărea pe carosabil'],
    ok: [0, 2],
    why: 'Indicatorul „Copii” anunță o zonă cu școli sau locuri de joacă.',
  },
  {
    ch: 'semne',
    sign: 'pedestrian',
    q: 'Vă apropiați de o trecere pentru pietoni nesemaforizată pe care s-a angajat un pieton. Ce faceți?',
    a: ['Acordați prioritate pietonului', 'Claxonați și treceți înaintea lui', 'Depășiți vehiculul care a oprit în fața trecerii'],
    ok: [0],
    why: 'Pietonul angajat pe trecere are prioritate. Depășirea pe trecerea pentru pietoni este interzisă.',
  },
  {
    ch: 'semne',
    sign: 'oneWay',
    q: 'Ce indică acest indicator?',
    a: ['Un drum cu sens unic', 'Un drum pe care puteți întâlni vehicule din sens opus', 'Obligația de a circula numai pe banda din stânga'],
    ok: [0],
    why: 'Pe un drum cu sens unic toate vehiculele circulă în același sens.',
  },
  {
    ch: 'semne',
    sign: 'parking',
    q: 'Ce indică acest indicator?',
    a: ['Un loc unde staționarea este permisă', 'Oprirea este interzisă', 'Un spital în apropiere'],
    ok: [0],
    why: 'Indicatorul „Parcare” arată locul amenajat pentru staționare.',
  },
  {
    ch: 'semne',
    sign: 'turnRight',
    q: 'Ce vă obligă acest indicator?',
    a: ['Să virați la dreapta', 'Să mergeți înainte', 'Să întoarceți'],
    ok: [0],
    why: 'Indicatoarele de obligare (albastre, rotunde) arată direcția pe care trebuie să o urmați.',
  },
  {
    ch: 'semne',
    sign: 'curveLeft',
    q: 'Ce faceți când vedeți acest indicator?',
    a: ['Reduceți viteza înainte de curbă', 'Accelerați în curbă', 'Nu depășiți în curbă dacă nu aveți vizibilitate suficientă'],
    ok: [0, 2],
    why: 'Frânați înainte de curbă, nu în ea. Depășirea în curbe cu vizibilitate redusă este interzisă.',
  },
  {
    ch: 'semne',
    sign: 'narrowRoad',
    q: 'Ce vă avertizează acest indicator?',
    a: ['Drumul se îngustează', 'Începe o autostradă', 'Urmează o trecere la nivel cu calea ferată'],
    ok: [0],
    why: 'Reduceți viteza și fiți atent la vehiculele care vin din sens opus.',
  },

  // ---------------------------------------------------------------- speed
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme în localități, dacă nu există alt indicator?',
    a: ['50 km/h', '60 km/h', '70 km/h'],
    ok: [0],
    why: 'În localități limita este 50 km/h, dacă indicatoarele nu arată altceva.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe autostradă?',
    a: ['120 km/h', '130 km/h', '150 km/h'],
    ok: [1],
    why: 'Pe autostradă, pentru categoria B, limita este 130 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe drumurile naționale europene (E), în afara localităților?',
    a: ['90 km/h', '100 km/h', '130 km/h'],
    ok: [1],
    why: 'Pe drumurile expres și pe cele naționale europene limita este 100 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Care este viteza maximă admisă pentru autoturisme pe celelalte drumuri din afara localităților?',
    a: ['80 km/h', '90 km/h', '100 km/h'],
    ok: [1],
    why: 'Pe celelalte categorii de drumuri din afara localităților limita este 90 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Cu cât este mai mică viteza maximă admisă în afara localităților pentru un șofer cu permis de mai puțin de un an?',
    a: ['10 km/h', '20 km/h', '30 km/h'],
    ok: [1],
    why: 'Șoferii începători au limitele din afara localităților mai mici cu 20 km/h.',
  },
  {
    ch: 'viteza',
    q: 'Ce sancțiune complementară primiți dacă depășiți viteza maximă admisă cu mai mult de 50 km/h?',
    a: ['Suspendarea permisului pentru 30 de zile', 'Suspendarea permisului pentru 90 de zile', 'Doar avertisment'],
    ok: [1],
    why: 'Depășirea limitei cu peste 50 km/h duce la suspendarea permisului pentru 90 de zile.',
  },
  {
    ch: 'viteza',
    q: 'Ce se întâmplă când cumulați 15 puncte de penalizare?',
    a: ['Permisul se suspendă pentru 30 de zile', 'Permisul se anulează definitiv', 'Nu se întâmplă nimic'],
    ok: [0],
    why: 'La 15 puncte de penalizare permisul se suspendă pentru 30 de zile.',
  },

  // ---------------------------------------------------------------- priority
  {
    ch: 'prioritate',
    q: 'Într-o intersecție fără semnalizare, cui trebuie să acordați prioritate?',
    a: ['Vehiculului care vine din dreapta', 'Vehiculului care vine din stânga', 'Vehiculului mai mare'],
    ok: [0],
    why: 'În intersecțiile nedirijate se aplică regula priorității de dreapta.',
  },
  {
    ch: 'prioritate',
    q: 'Virați la stânga într-o intersecție. Cui acordați prioritate?',
    a: ['Vehiculelor din sens opus care merg înainte', 'Vehiculelor din sens opus care virează la dreapta', 'Nimănui, dacă ați semnalizat'],
    ok: [0, 1],
    why: 'La virajul la stânga cedați trecerea celor care vin din față și merg înainte sau la dreapta.',
  },
  {
    ch: 'prioritate',
    q: 'Polițistul vă face semn să treceți, deși semaforul arată roșu. Ce faceți?',
    a: ['Respectați semaforul', 'Respectați semnalul polițistului', 'Opriți și așteptați verdele'],
    ok: [1],
    why: 'Semnalele polițistului au prioritate față de semafoare, indicatoare și reguli.',
  },
  {
    ch: 'semafoare',
    q: 'Ce semnifică săgeata verde intermitentă montată lângă lumina roșie a semaforului?',
    a: ['Puteți vira în direcția săgeții, acordând prioritate celorlalți participanți la trafic', 'Aveți prioritate față de toți ceilalți', 'Trebuie să așteptați lumina verde'],
    ok: [0],
    why: 'Săgeata verde permite virajul, dar fără prioritate: cedați pietonilor și vehiculelor care au verde.',
  },
  {
    ch: 'semafoare',
    q: 'Ce semnifică lumina galbenă intermitentă a semaforului?',
    a: ['Circulați cu atenție, respectând indicatoarele și regulile de prioritate', 'Opriți obligatoriu', 'Aveți prioritate față de toți'],
    ok: [0],
    why: 'Galbenul intermitent avertizează: intersecția se trece după indicatoare și reguli.',
  },
  {
    ch: 'semafoare',
    q: 'Semaforul trece din verde în galben fix. Ce faceți?',
    a: ['Opriți înainte de semafor', 'Treceți dacă sunteți atât de aproape încât nu mai puteți opri în siguranță', 'Accelerați ca să prindeți verdele'],
    ok: [0, 1],
    why: 'Galbenul fix înseamnă oprire, cu excepția cazului în care nu mai puteți opri în siguranță.',
  },
  {
    ch: 'prioritate',
    q: 'Vreți să intrați într-un sens giratoriu semnalizat cu „Cedează trecerea”. Cui acordați prioritate?',
    a: ['Vehiculelor care circulă deja în sensul giratoriu', 'Vehiculelor care așteaptă să intre din dreapta', 'Nimănui'],
    ok: [0],
    why: 'Cei care circulă deja în sensul giratoriu au prioritate.',
  },
  {
    ch: 'prioritate',
    q: 'Cum ieșiți corect dintr-un sens giratoriu?',
    a: ['Semnalizați la dreapta înainte de ieșire', 'Ieșiți fără să semnalizați', 'Vă asigurați că nu tăiați calea bicicliștilor sau pietonilor'],
    ok: [0, 2],
    why: 'Semnalizați ieșirea la dreapta și vă asigurați înainte de a ieși.',
  },
  {
    ch: 'prioritate',
    q: 'Într-o localitate, un autobuz semnalizează că pleacă din stație. Ce faceți?',
    a: ['Îi acordați prioritate', 'Accelerați și îl depășiți', 'Claxonați'],
    ok: [0],
    why: 'În localități trebuie să lăsați să plece autobuzele care semnalizează ieșirea din stație.',
  },
  {
    ch: 'prioritate',
    q: 'Din spate se apropie o ambulanță cu semnale luminoase albastre și sirenă. Ce faceți?',
    a: ['Îi faceți loc să treacă, trăgând spre dreapta', 'Opriți, dacă este nevoie', 'Continuați la fel'],
    ok: [0, 1],
    why: 'Vehiculele cu regim de circulație prioritară trebuie lăsate să treacă.',
  },
  {
    ch: 'prioritate',
    q: 'Un pieton cu baston alb traversează strada. Ce faceți?',
    a: ['Îi acordați prioritate', 'Claxonați ca să grăbească pasul', 'Treceți prin spatele lui fără să încetiniți'],
    ok: [0],
    why: 'Bastonul alb arată că persoana are deficiențe de vedere: opriți și lăsați-o să treacă.',
  },
  {
    ch: 'prioritate',
    q: 'Un tramvai este oprit într-o stație fără refugiu pentru pietoni. Ce faceți?',
    a: ['Opriți în spatele tramvaiului cât urcă și coboară călătorii', 'Treceți pe lângă el cu viteză mare', 'Claxonați'],
    ok: [0],
    why: 'Călătorii traversează carosabilul spre tramvai, așa că trebuie să opriți.',
  },

  // ---------------------------------------------------------------- overtaking, stopping, reversing
  {
    ch: 'oprire',
    q: 'Când puteți depăși pe partea dreaptă?',
    a: ['Când vehiculul din față a semnalizat virajul la stânga și s-a deplasat spre stânga', 'Oricând aveți loc', 'Pe acostament, când e aglomerat'],
    ok: [0],
    why: 'Depășirea se face prin stânga; pe dreapta numai când cel din față virează la stânga.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzisă depășirea?',
    a: ['Pe trecerea pentru pietoni', 'În tunel', 'Pe un drum drept, cu vizibilitate bună și linie discontinuă'],
    ok: [0, 1],
    why: 'Depășirea este interzisă, printre altele, pe trecerile pentru pietoni și în tuneluri.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzis mersul înapoi?',
    a: ['Pe autostradă', 'În intersecții', 'Într-o parcare, cu vizibilitate bună'],
    ok: [0, 1],
    why: 'Mersul înapoi este interzis pe autostradă și în intersecții.',
  },
  {
    ch: 'oprire',
    q: 'Unde este interzisă oprirea voluntară?',
    a: ['Pe trecerea pentru pietoni', 'În tunel', 'Pe un loc de parcare marcat'],
    ok: [0, 1],
    why: 'Pe trecerile pentru pietoni și în tuneluri oprirea este interzisă.',
  },
  {
    ch: 'oprire',
    q: 'La ce distanță de indicatorul unei stații de autobuz este interzisă oprirea?',
    a: ['La mai puțin de 10 m înainte și după', 'La mai puțin de 25 m înainte și după', 'La mai puțin de 50 m înainte'],
    ok: [1],
    why: 'Oprirea este interzisă la mai puțin de 25 m înainte și după indicatorul stației.',
  },
  {
    ch: 'oprire',
    q: 'Cât poate dura cel mult oprirea voluntară a unui vehicul?',
    a: ['5 minute', '10 minute', '15 minute'],
    ok: [0],
    why: 'Oprirea înseamnă cel mult 5 minute; peste 5 minute este staționare.',
  },
  {
    ch: 'semafoare',
    q: 'Ce înseamnă marcajul cu linie continuă din mijlocul drumului?',
    a: ['Nu aveți voie să îl încălcați sau să îl treceți', 'Puteți depăși dacă nu vine nimeni', 'Puteți întoarce peste el'],
    ok: [0],
    why: 'Linia continuă nu poate fi încălcată.',
  },
  {
    ch: 'oprire',
    q: 'Vreți să schimbați banda. Ce faceți?',
    a: ['Semnalizați din timp', 'Vă uitați în oglinzi și în unghiul mort', 'Schimbați banda brusc, ca să nu pierdeți timp'],
    ok: [0, 1],
    why: 'Semnalizați, vă asigurați, apoi schimbați banda lin.',
  },

  // ---------------------------------------------------------------- alcohol, phone, belts, documents
  {
    ch: 'sofer',
    q: 'Aveți voie să conduceți după ce ați consumat alcool?',
    a: ['Nu, conducerea sub influența alcoolului este interzisă', 'Da, dacă vă simțiți bine', 'Da, dacă ați băut doar o bere'],
    ok: [0],
    why: 'În România alcoolul la volan se sancționează; peste 0,40 mg/l în aerul expirat este infracțiune.',
  },
  {
    ch: 'sofer',
    q: 'Cum aveți voie să folosiți telefonul mobil în timpul mersului?',
    a: ['Numai cu un sistem „mâini libere”', 'Ținându-l în mână, dacă vorbiți puțin', 'Ținându-l în mână, la semafor'],
    ok: [0],
    why: 'Telefonul ținut în mână este interzis în timpul conducerii.',
  },
  {
    ch: 'sofer',
    q: 'Cine trebuie să poarte centura de siguranță?',
    a: ['Șoferul', 'Pasagerul din față', 'Pasagerii din spate'],
    ok: [0, 1, 2],
    why: 'Centura este obligatorie pentru toți cei din mașină.',
  },
  {
    ch: 'sofer',
    q: 'Cum transportați un copil mic într-un autoturism?',
    a: ['Într-un sistem de reținere (scaun pentru copii) potrivit vârstei și înălțimii', 'În brațele unui adult', 'Liber pe bancheta din spate'],
    ok: [0],
    why: 'Copiii trebuie transportați în sisteme de reținere omologate.',
  },
  {
    ch: 'sofer',
    q: 'Care este vârsta minimă pentru permisul de categoria B?',
    a: ['16 ani', '18 ani', '21 de ani'],
    ok: [1],
    why: 'Permisul de categoria B se poate obține de la 18 ani.',
  },
  {
    ch: 'sofer',
    q: 'Cât timp este valabil permisul de conducere de categoria B?',
    a: ['5 ani', '10 ani', 'Pe viață'],
    ok: [1],
    why: 'Permisul de categoria B se preschimbă la 10 ani.',
  },
  {
    ch: 'sofer',
    q: 'Când sunt obligatorii anvelopele de iarnă?',
    a: ['Când drumul este acoperit cu zăpadă, gheață sau polei', 'Numai în ianuarie', 'Niciodată'],
    ok: [0],
    why: 'Pe drumuri cu zăpadă, gheață sau polei anvelopele de iarnă sunt obligatorii.',
  },

  // ---------------------------------------------------------------- breakdowns, accidents, first aid
  {
    ch: 'accidente',
    q: 'Mașina rămâne în pană pe carosabil. Ce faceți?',
    a: ['Aprindeți luminile de avarie', 'Semnalizați vehiculul cu triunghiurile reflectorizante', 'Plecați și lăsați mașina nesemnalizată'],
    ok: [0, 1],
    why: 'Mașina oprită pe drum trebuie semnalizată cu avariile și cu triunghiurile reflectorizante.',
  },
  {
    ch: 'accidente',
    q: 'Ajungeți primul la un accident cu răniți. Ce faceți?',
    a: ['Sunați la 112', 'Acordați primul ajutor, dacă știți și nu vă puneți în pericol', 'Plecați, ca să nu întârziați'],
    ok: [0, 1],
    why: 'Anunțați 112 și ajutați în siguranță. Părăsirea locului unui accident cu victime este interzisă.',
  },
  {
    ch: 'accidente',
    q: 'O victimă a unui accident este inconștientă în mașină. Când o scoateți din vehicul?',
    a: ['Numai dacă este în pericol imediat, de exemplu foc', 'Întotdeauna, imediat', 'Niciodată, chiar dacă mașina arde'],
    ok: [0],
    why: 'Mutarea unei victime poate agrava rănile; o mutați doar dacă rămânerea pe loc este mai periculoasă.',
  },

  // ---------------------------------------------------------------- safe and economical driving
  {
    ch: 'preventiv',
    q: 'Simțiți că mașina „plutește” pe apă (acvaplanare). Ce faceți?',
    a: ['Ridicați piciorul de pe accelerație', 'Țineți volanul drept', 'Frânați brusc'],
    ok: [0, 1],
    why: 'Frâna bruscă sau virajul brusc pot duce la derapaj. Lăsați mașina să încetinească singură.',
  },
  {
    ch: 'preventiv',
    q: 'Cum circulați pe ceață?',
    a: ['Reduceți viteza', 'Folosiți faza lungă', 'Măriți distanța față de vehiculul din față'],
    ok: [0, 2],
    why: 'Faza lungă se reflectă în ceață și vă orbește; folosiți faza scurtă și lumina de ceață.',
  },
  {
    ch: 'preventiv',
    q: 'Noaptea, cu faza lungă aprinsă, vine un vehicul din sens opus. Ce faceți?',
    a: ['Treceți pe faza scurtă', 'Păstrați faza lungă', 'Stingeți toate luminile'],
    ok: [0],
    why: 'Faza lungă îl orbește pe cel din față; la întâlnire treceți pe faza scurtă.',
  },
  {
    ch: 'preventiv',
    q: 'De ce depinde distanța de siguranță față de vehiculul din față?',
    a: ['De viteză', 'De starea drumului (uscat, ud, înghețat)', 'De culoarea mașinii'],
    ok: [0, 1],
    why: 'La viteză mai mare și pe drum ud sau înghețat aveți nevoie de o distanță mai mare.',
  },
  {
    ch: 'preventiv',
    q: 'Vă simțiți obosit la volan. Ce faceți?',
    a: ['Opriți într-un loc sigur și vă odihniți', 'Deschideți geamul și mai conduceți câteva ore', 'Măriți viteza ca să ajungeți mai repede'],
    ok: [0],
    why: 'Oboseala încetinește reacțiile; singura soluție sigură este pauza.',
  },
  {
    ch: 'preventiv',
    q: 'Ce înseamnă să conduceți economic?',
    a: ['Schimbați treptele de viteză la turații moderate', 'Anticipați traficul ca să evitați frânările bruște', 'Lăsați motorul să meargă mult timp la ralanti'],
    ok: [0, 1],
    why: 'Accelerările și frânările line consumă mai puțin combustibil.',
  },
  {
    ch: 'semafoare',
    q: 'La o trecere la nivel cu calea ferată, lumina roșie clipește. Ce faceți?',
    a: ['Opriți: trecerea este interzisă', 'Treceți repede, dacă nu vedeți trenul', 'Ocoliți bariera'],
    ok: [0],
    why: 'Lumina roșie intermitentă anunță apropierea trenului.',
  },
];
