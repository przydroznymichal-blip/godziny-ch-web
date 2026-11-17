/* Godziny CH – silnik obliczeń (wierny port core/*.kt z aplikacji Android).
 * Daty: "RRRR-MM-DD", czas: "RRRR-MM-DDTHH:MM" (czas lokalny bez strefy – jak LocalDateTime).
 * Zgodność z Kotlinem sprawdzana testem porównawczym na wektorach z wersji Android. */
(function (global) {
  'use strict';

  // ---------- daty (arytmetyka w UTC = bez przesunięć czasu letniego, jak LocalDateTime) ----------
  const D = {
    ms(s) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); const t = s.length > 10 ? s.slice(11, 16).split(':').map(Number) : [0, 0]; return Date.UTC(y, m - 1, d, t[0], t[1]); },
    min(a, b) { return Math.round((D.ms(b) - D.ms(a)) / 60000); },          // minuty od a do b
    dzienTyg(s) { const w = new Date(D.ms(s)).getUTCDay(); return w === 0 ? 7 : w; }, // 1 = pon … 7 = nd
    dodaj(s, dni) { return new Date(D.ms(s) + dni * 86400000).toISOString().slice(0, 10); },
    dodajMin(s, m) { return new Date(D.ms(s) + m * 60000).toISOString().slice(0, 16); },
    data(s) { return s.slice(0, 10); },
    dt(d, h, m = 0) { return d + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); },
    /** Tydzień ISO: [rok tygodniowy, nr tygodnia]. */
    iso(s) {
      const t = new Date(D.ms(s)); const dzien = (t.getUTCDay() + 6) % 7;
      t.setUTCDate(t.getUTCDate() - dzien + 3); const rok = t.getUTCFullYear();
      const pierwszy = new Date(Date.UTC(rok, 0, 4));
      return [rok, 1 + Math.round(((t - pierwszy) / 86400000 - 3 + ((pierwszy.getUTCDay() + 6) % 7)) / 7)];
    },
    dzis() { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); },
    teraz() { const t = new Date(); return D.dzis() + 'T' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'); },
  };

  const J = ['pl', 'de', 'en', 'it'];
  const w4 = (j, pl, de, en, it) => ({ pl, de, en, it })[j] ?? pl;
  const f1 = x => x.toFixed(1), f0 = x => x.toFixed(0);

  // ---------- model ----------
  const RODZAJE = {
    PRACA: { pl: 'Praca', de: 'Arbeit', en: 'Work', it: 'Lavoro', zaliczany: false },
    URLOP: { pl: 'Urlop', de: 'Ferien', en: 'Holiday', it: 'Ferie', zaliczany: true },
    CHOROBA: { pl: 'Choroba', de: 'Krankheit', en: 'Sick leave', it: 'Malattia', zaliczany: true },
    WYPADEK: { pl: 'Wypadek (Suva)', de: 'Unfall (Suva)', en: 'Accident (Suva)', it: 'Infortunio (Suva)', zaliczany: true },
    SWIETO: { pl: 'Święto', de: 'Feiertag', en: 'Public holiday', it: 'Giorno festivo', zaliczany: true },
    WOLNE: { pl: 'Wolne', de: 'Frei', en: 'Day off', it: 'Libero', zaliczany: false },
  };
  const MIEJSCA = {
    BUDOWA: { pl: 'Budowa', de: 'Baustelle', en: 'Site', it: 'Cantiere' },
    WARSZTAT: { pl: 'Warsztat', de: 'Werkstatt', en: 'Workshop', it: 'Officina' },
    INNE: { pl: 'Inne', de: 'Andere', en: 'Other', it: 'Altro' },
  };

  const PROFIL_DOMYSLNY = {
    nazwa: 'Metallbau LGAV, 41 h', godzinyUmowneTydzien: 41, dniRoboczeTydzien: 5, limitUstawowyTydzien: 50,
    stawkaGodzinowa: 0, doplataUeberstundenProc: 25, nadgodzinyRoczneLgav: true, limitWyplatyBezDoplaty: 100,
    doplataUeberzeitProc: 25, doplataNocProc: 50, doplataNiedzielaProc: 100, doplataSwietoProc: 100,
    dniUrlopu: 23, trzynastka: true, nocOd: 23, nocDo: 6, warsztat: null, progDelegacjiKm: 15, dietaDzienna: 18,
    wspolczynnikDrogi: 1.25, dojazdDoWarsztatuMin: 0, kanton: 'ZH',
  };
  /** Profil z wartościami pochodnymi (jak gettery w Profil.kt). */
  function profil(p) {
    const x = Object.assign({}, PROFIL_DOMYSLNY, p || {});
    if (!(x.godzinyUmowneTydzien >= 0 && x.godzinyUmowneTydzien <= 80)) throw new Error('Godziny umowne poza zakresem');
    if (x.limitUstawowyTydzien !== 45 && x.limitUstawowyTydzien !== 50) throw new Error('Limit ustawowy to 45 albo 50 h');
    if (!(x.dniUrlopu >= 20 && x.dniUrlopu <= 60)) throw new Error('Ustawowo min. 20 dni urlopu (OR 329a)');
    x.doplataUrlopowaProc = x.dniUrlopu * 100 / (5 * 52 - x.dniUrlopu);
    x.trzynastkaProc = x.trzynastka ? 100 / 12 : 0;
    x.doplataNocEfektywna = Math.max(25, x.doplataNocProc);
    x.doplataNiedzielaEfektywna = Math.max(50, x.doplataNiedzielaProc);
    x.doplataSwietoEfektywna = Math.max(50, x.doplataSwietoProc);
    x.doplataUeberzeitEfektywna = Math.max(25, x.doplataUeberzeitProc);
    x.maksDzienPracy = x.limitUstawowyTydzien / 5 + 2;
    x.godzinyDzienne = x.godzinyUmowneTydzien / x.dniRoboczeTydzien;
    x.rocznyLimitUeberzeit = x.limitUstawowyTydzien === 45 ? 170 : 140;
    return x;
  }

  /** Walidacja wpisu – jak init{} w Wpis. */
  function sprawdzWpis(w) {
    if (w.rodzaj === 'PRACA' && !w.praca) throw new Error('Dzień pracy bez godzin pracy: ' + w.data);
    const odc = o => { if (D.ms(o.koniec) < D.ms(o.start)) throw new Error('Koniec przed startem'); };
    if (w.praca) odc(w.praca);
    (w.przerwy || []).forEach(o => { odc(o); if (w.praca && (D.ms(o.start) < D.ms(w.praca.start) || D.ms(o.koniec) > D.ms(w.praca.koniec))) throw new Error('Przerwa poza czasem pracy: ' + w.data); });
    const s = [...(w.przerwy || [])].sort((a, b) => D.ms(a.start) - D.ms(b.start));
    for (let i = 1; i < s.length; i++) if (D.ms(s[i].start) < D.ms(s[i - 1].koniec)) throw new Error('Przerwy nakładają się: ' + w.data);
    return w;
  }
  const wpis = w => sprawdzWpis(Object.assign({ rodzaj: 'PRACA', praca: null, przerwy: [], miejsce: 'BUDOWA', nazwaMiejsca: '', notatka: '', kmOdWarsztatu: null, kmTrasy: null, delegacja: null, podrozMin: null }, w));

  // ---------- święta ----------
  const NAZWY_SWIAT = {
    nowyrok: ['Neujahr', 'Nowy Rok', "New Year's Day", 'Capodanno'],
    piatek: ['Karfreitag', 'Wielki Piątek', 'Good Friday', 'Venerdì Santo'],
    ponwielk: ['Ostermontag', 'Poniedziałek Wielkanocny', 'Easter Monday', "Lunedì dell'Angelo"],
    praca: ['Tag der Arbeit', 'Święto Pracy', 'Labour Day', 'Festa del lavoro'],
    wniebo: ['Auffahrt', 'Wniebowstąpienie', 'Ascension Day', 'Ascensione'],
    zielone: ['Pfingstmontag', 'Zielone Świątki (poniedziałek)', 'Whit Monday', 'Lunedì di Pentecoste'],
    narodowe: ['Bundesfeier', 'Święto Narodowe Szwajcarii', 'Swiss National Day', 'Festa nazionale'],
    boze: ['Weihnachten', 'Boże Narodzenie', 'Christmas Day', 'Natale'],
    szczepan: ['Stephanstag', 'św. Szczepana', "St Stephen's Day", 'Santo Stefano'],
  };
  const Swieta = {
    wielkanoc(rok) {
      const a = rok % 19, b = Math.floor(rok / 100), c = rok % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
      const mies = Math.floor((h + l - 7 * m + 114) / 31), dz = ((h + l - 7 * m + 114) % 31) + 1;
      return rok + '-' + String(mies).padStart(2, '0') + '-' + String(dz).padStart(2, '0');
    },
    klucze(rok, kanton = 'ZH') {
      const w = Swieta.wielkanoc(rok), r = String(rok);
      const m = { [r + '-01-01']: 'nowyrok', [D.dodaj(w, -2)]: 'piatek', [D.dodaj(w, 1)]: 'ponwielk', [D.dodaj(w, 39)]: 'wniebo', [D.dodaj(w, 50)]: 'zielone', [r + '-08-01']: 'narodowe', [r + '-12-25']: 'boze', [r + '-12-26']: 'szczepan' };
      if (String(kanton).toUpperCase() === 'ZH') m[r + '-05-01'] = 'praca';
      return m;
    },
    czySwieto(d, kanton = 'ZH') { return !!Swieta.klucze(+d.slice(0, 4), kanton)[d]; },
    nazwa(d, kanton, j) { const k = Swieta.klucze(+d.slice(0, 4), kanton)[d]; if (!k) return null; const n = NAZWY_SWIAT[k]; return w4(j, n[1], n[0], n[2], n[3]); },
  };

  // ---------- geo ----------
  const Geo = {
    km(a, b) {
      const r = 6371.0088, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
      return 2 * r * Math.asin(Math.sqrt(h));
    },
    dlugoscTrasy(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Geo.km(p[i - 1], p[i]); return s; },
    odfiltruj(p, maxKmh = 160) {
      const w = [];
      for (const x of [...p].sort((a, b) => a.czasMs - b.czasMs)) {
        const o = w[w.length - 1]; if (!o) { w.push(x); continue; }
        const h = (x.czasMs - o.czasMs) / 3600000; if (h <= 0) continue;
        if (Geo.km(o.gps, x.gps) / h <= maxKmh) w.push(x);
      }
      return w;
    },
    odlegloscMiejscaPracy(p, warsztat) {
      const f = Geo.odfiltruj(p); if (!f.length) return null; if (f.length === 1) return Geo.km(f[0].gps, warsztat);
      const wagi = []; for (let i = 1; i < f.length; i++) wagi.push([Geo.km(f[i - 1].gps, warsztat), f[i].czasMs - f[i - 1].czasMs]);
      const suma = wagi.reduce((s, x) => s + x[1], 0); if (suma <= 0) return Geo.km(f[f.length - 1].gps, warsztat);
      let acc = 0; for (const [d, w] of [...wagi].sort((a, b) => a[0] - b[0])) { acc += w; if (acc >= suma / 2) return d; }
      return Math.max(...wagi.map(x => x[0]));
    },
  };

  // ---------- kalkulator ----------
  const ostrz = (data, pl, de, en, it) => ({ data, pl, de, en, it, tekst(j) { return w4(j, this.pl, this.de, this.en, this.it); } });
  const minOdc = o => D.min(o.start, o.koniec);

  const K = {
    czyDelegacja(w, p) {
      if (w.rodzaj !== 'PRACA') return false;
      if (w.delegacja !== null && w.delegacja !== undefined) return w.delegacja;
      if (w.kmOdWarsztatu === null || w.kmOdWarsztatu === undefined) return false;
      return w.kmOdWarsztatu * p.wspolczynnikDrogi > p.progDelegacjiKm;
    },
    minimalnaPrzerwa(m) { return m > 540 ? 60 : m > 420 ? 30 : m > 330 ? 15 : 0; },
    minutyNocne(o, nocOd, nocDo) {
      let suma = 0, dzien = D.dodaj(D.data(o.start), -1); const ost = D.data(o.koniec);
      while (D.ms(dzien) <= D.ms(ost)) {
        const pocz = D.dt(dzien, nocOd), kon = D.dt(D.dodaj(dzien, nocDo <= nocOd ? 1 : 0), nocDo);
        const s = D.ms(pocz) > D.ms(o.start) ? pocz : o.start, k = D.ms(kon) < D.ms(o.koniec) ? kon : o.koniec;
        if (D.ms(k) > D.ms(s)) suma += D.min(s, k);
        dzien = D.dodaj(dzien, 1);
      }
      return suma;
    },
    dzien(w, p) {
      const o = [], swieto = Swieta.czySwieto(w.data, p.kanton), niedziela = D.dzienTyg(w.data) === 7;
      if (w.rodzaj !== 'PRACA' || !w.praca) {
        const zal = RODZAJE[w.rodzaj].zaliczany ? Math.round(p.godzinyDzienne * 60) : 0;
        return { data: w.data, rodzaj: w.rodzaj, minutyPracy: 0, minutyZaliczone: zal, minutyPrzerw: 0, minimalnaPrzerwa: 0, minutyNocne: 0, niedziela, swieto, ostrzezenia: [], minutyPodrozy: 0 };
      }
      const brutto = minOdc(w.praca), przerwy = (w.przerwy || []).reduce((s, x) => s + minOdc(x), 0);
      const praca = Math.max(0, brutto - przerwy), minP = K.minimalnaPrzerwa(praca);
      if (przerwy < minP) o.push(ostrz(w.data,
        `Za krótka przerwa: ${przerwy} min, wymagane min. ${minP} min (ArG art. 15)`,
        `Pause zu kurz: ${przerwy} Min., mindestens ${minP} Min. (Art. 15 ArG)`,
        `Break too short: ${przerwy} min, at least ${minP} min required (ArG Art. 15)`,
        `Pausa troppo breve: ${przerwy} min, minimo ${minP} min (art. 15 LL)`));
      if (D.dzienTyg(w.data) <= 5 && praca > p.maksDzienPracy * 60) { const h = f1(praca / 60); o.push(ostrz(w.data,
        `Ponad 2 h Überzeit w jednym dniu: ${h} h pracy (ArG art. 12 ust. 2)`,
        `Mehr als 2 Std. Überzeit pro Tag: ${h} Std. (Art. 12 Abs. 2 ArG)`,
        `More than 2 h of Überzeit in one day: ${h} h worked (ArG Art. 12(2))`,
        `Più di 2 h di lavoro straordinario in un giorno: ${h} h (art. 12 cpv. 2 LL)`)); }
      if (brutto > 14 * 60) o.push(ostrz(w.data,
        'Dzień pracy dłuższy niż 14 h z przerwami (ArG art. 10)', 'Arbeitstag über 14 Std. inkl. Pausen (Art. 10 ArG)',
        'Working day longer than 14 h including breaks (ArG Art. 10)', 'Giornata lavorativa oltre 14 h incluse le pause (art. 10 LL)'));
      const noc = K.minutyNocne(w.praca, p.nocOd, p.nocDo) - (w.przerwy || []).reduce((s, x) => s + K.minutyNocne(x, p.nocOd, p.nocDo), 0);
      const podroz = Math.max(0, (w.podrozMin || 0) - 2 * p.dojazdDoWarsztatuMin);
      return { data: w.data, rodzaj: w.rodzaj, minutyPracy: praca + podroz, minutyZaliczone: praca + podroz, minutyPrzerw: przerwy, minimalnaPrzerwa: minP, minutyNocne: Math.max(0, noc), niedziela, swieto, ostrzezenia: o, minutyPodrozy: podroz };
    },
    ostrzezeniaOdpoczynku(wpisy) {
      const p = wpisy.filter(w => w.praca).sort((a, b) => D.ms(a.praca.start) - D.ms(b.praca.start)), o = [];
      for (let i = 1; i < p.length; i++) {
        const h = D.min(p[i - 1].praca.koniec, p[i].praca.start) / 60;
        if (h >= 0 && h < 11) o.push(ostrz(p[i].data,
          `Odpoczynek tylko ${f1(h)} h – wymagane min. 11 h (ArG art. 15a)`, `Ruhezeit nur ${f1(h)} Std. – mindestens 11 Std. (Art. 15a ArG)`,
          `Rest period only ${f1(h)} h – at least 11 h required (ArG Art. 15a)`, `Riposo solo ${f1(h)} h – minimo 11 h (art. 15a LL)`));
      }
      return o;
    },
    tydzien(dni, p) {
      const [rok, nr] = D.iso(dni[0].data), razem = dni.reduce((s, d) => s + d.minutyZaliczone, 0) / 60;
      return { rok, tydzien: nr, godzinyRazem: razem, godzinyPodstawowe: Math.min(razem, p.godzinyUmowneTydzien),
        ueberstunden: Math.max(0, Math.min(razem, p.limitUstawowyTydzien) - p.godzinyUmowneTydzien),
        ueberzeit: Math.max(0, razem - p.limitUstawowyTydzien), dni: [...dni].sort((a, b) => D.ms(a.data) - D.ms(b.data)) };
    },
    okres(wpisy, p, ueberzeitWczesniej = 0) {
      const dni = wpisy.map(w => K.dzien(w, p)), grupy = new Map();
      dni.forEach(d => { const [r, n] = D.iso(d.data), k = r * 100 + n; if (!grupy.has(k)) grupy.set(k, []); grupy.get(k).push(d); });
      const tygodnie = [...grupy.keys()].sort((a, b) => a - b).map(k => K.tydzien(grupy.get(k), p));
      let os = dni.flatMap(d => d.ostrzezenia).concat(K.ostrzezeniaOdpoczynku(wpisy));
      const ueberzeit = tygodnie.reduce((s, t) => s + t.ueberzeit, 0), wRoku = ueberzeitWczesniej + ueberzeit;
      if (wRoku > p.rocznyLimitUeberzeit) { const maxD = wpisy.map(w => w.data).sort().pop(); os.push(ostrz(maxD,
        `Przekroczony roczny limit Überzeit: ${f1(wRoku)} h > ${f0(p.rocznyLimitUeberzeit)} h (ArG art. 12)`,
        `Jährliche Überzeit überschritten: ${f1(wRoku)} Std. > ${f0(p.rocznyLimitUeberzeit)} Std. (Art. 12 ArG)`,
        `Annual Überzeit limit exceeded: ${f1(wRoku)} h > ${f0(p.rocznyLimitUeberzeit)} h (ArG Art. 12)`,
        `Limite annuo di lavoro straordinario superato: ${f1(wRoku)} h > ${f0(p.rocznyLimitUeberzeit)} h (art. 12 LL)`)); }
      const r = p.stawkaGodzinowa, nocH = dni.reduce((s, d) => s + d.minutyNocne, 0) / 60;
      const swW = p.doplataSwietoEfektywna >= p.doplataNiedzielaEfektywna, prace = dni.filter(d => d.rodzaj === 'PRACA');
      const swH = prace.filter(d => d.swieto && (swW || !d.niedziela)).reduce((s, d) => s + d.minutyPracy, 0) / 60;
      const ndH = prace.filter(d => d.niedziela && !(d.swieto && swW)).reduce((s, d) => s + d.minutyPracy, 0) / 60;
      const ust = tygodnie.reduce((s, t) => s + t.ueberstunden, 0), podst = tygodnie.reduce((s, t) => s + t.godzinyPodstawowe, 0);
      const zalNie = dni.filter(d => d.rodzaj !== 'PRACA').reduce((s, d) => s + d.minutyZaliczone, 0) / 60;
      const podstPraca = Math.max(0, podst - zalNie), doplUst = p.nadgodzinyRoczneLgav ? 0 : p.doplataUeberstundenProc;
      const placa = podstPraca * r + ust * r * (1 + doplUst / 100) + ueberzeit * r * (1 + p.doplataUeberzeitEfektywna / 100);
      const delg = wpisy.filter(w => K.czyDelegacja(w, p)).length;
      const w = { tygodnie, godzinyRazem: tygodnie.reduce((s, t) => s + t.godzinyRazem, 0), godzinyPodstawowe: podst, ueberstunden: ust, ueberzeit,
        godzinyNocne: nocH, godzinyNiedzielne: ndH, godzinySwiateczne: swH,
        kwotaPodstawowa: podstPraca * r, kwotaUeberstunden: ust * r * (1 + doplUst / 100), kwotaUeberzeit: ueberzeit * r * (1 + p.doplataUeberzeitEfektywna / 100),
        kwotaDoplatNoc: nocH * r * p.doplataNocEfektywna / 100, kwotaDoplatNiedziela: ndH * r * p.doplataNiedzielaEfektywna / 100, kwotaDoplatSwieto: swH * r * p.doplataSwietoEfektywna / 100,
        ostrzezenia: os.sort((a, b) => D.ms(a.data) - D.ms(b.data)),
        kwotaUrlopowa: placa * p.doplataUrlopowaProc / 100, kwotaTrzynastka: podstPraca * r * p.trzynastkaProc / 100,
        dniDelegacji: delg, kwotaDiet: delg * p.dietaDzienna };
      w.kwotaZaGodziny = w.kwotaPodstawowa + w.kwotaUeberstunden + w.kwotaUeberzeit + w.kwotaDoplatNoc + w.kwotaDoplatNiedziela + w.kwotaDoplatSwieto;
      w.kwotaRazem = w.kwotaZaGodziny + w.kwotaUrlopowa + w.kwotaTrzynastka;
      return w;
    },
    rok(wszystkie, rok, p, doDnia = rok + '-12-31') {
      const w = wszystkie.filter(x => D.iso(x.data)[0] === rok && D.ms(x.data) <= D.ms(doDnia));
      if (!w.length) return { rok, saldo: 0, ueberstunden: 0, bezDoplaty: 0, zDoplata: 0, kwotaDoplaty: 0, ueberzeit: 0 };
      const t = K.okres(w, p).tygodnie, saldo = t.reduce((s, x) => s + Math.min(x.godzinyRazem, p.limitUstawowyTydzien) - p.godzinyUmowneTydzien, 0);
      const ust = Math.max(0, saldo), bez = Math.min(ust, p.limitWyplatyBezDoplaty), z = Math.max(0, ust - p.limitWyplatyBezDoplaty);
      return { rok, saldo, ueberstunden: ust, bezDoplaty: bez, zDoplata: z, kwotaDoplaty: z * p.stawkaGodzinowa * p.doplataUeberstundenProc / 100, ueberzeit: t.reduce((s, x) => s + x.ueberzeit, 0) };
    },
    /** Miesiąc z pełnymi tygodniami ISO (tydzień należy do miesiąca swojego czwartku). */
    miesiac(wszystkie, rok, mies, p, ueberzeitWczesniej = 0) {
      const ym = rok * 100 + mies;
      const wyb = wszystkie.filter(w => { const c = D.dodaj(w.data, 4 - D.dzienTyg(w.data)); return +c.slice(0, 4) * 100 + +c.slice(5, 7) === ym; });
      return K.okres(wyb, p, ueberzeitWczesniej);
    },
  };

  global.GodzinyCH = { D, J, RODZAJE, MIEJSCA, PROFIL_DOMYSLNY, profil, wpis, Swieta, Geo, Kalkulator: K };
})(typeof window !== 'undefined' ? window : globalThis);
