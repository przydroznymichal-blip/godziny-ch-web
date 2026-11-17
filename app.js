/* Godziny CH – interfejs PWA (iPhone / każda przeglądarka). Dane tylko w telefonie (localStorage).
 * Format danych i kopii zapasowej = taki sam jak w aplikacji Android (można przenosić dane między telefonami). */
(function () {
  'use strict';
  const { D, RODZAJE, MIEJSCA, profil: mkProfil, wpis: mkWpis, Swieta, Geo, Kalkulator: K } = window.GodzinyCH;

  // ---------- język ----------
  const LS = window.localStorage;
  const ls = { get(k, d) { try { const v = LS.getItem('gch_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { LS.setItem('gch_' + k, JSON.stringify(v)); return true; } catch (e) { alert('Storage error: ' + e.message); return false; } } };
  let j = ls.get('jezyk', null) || (['pl', 'de', 'en', 'it'].includes((navigator.language || 'en').slice(0, 2)) ? navigator.language.slice(0, 2) : 'en');
  const t = (pl, de, en, it) => ({ pl, de, en, it })[j];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const DNI = { pl: ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'], de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], it: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] };
  const MIES = { pl: ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'],
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'] };
  const dzienTyg = (d, jj = j) => DNI[jj][D.dzienTyg(d) - 1];
  const dmy = d => d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4);
  const hm = m => Math.floor(m / 60) + ':' + String(Math.abs(m % 60)).padStart(2, '0');
  const h = x => x.toFixed(2).replace('.', ',') + ' h';
  const chf = x => 'CHF ' + x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const godz = s => s.slice(11, 16);

  // ---------- magazyn (format Android) ----------
  const odcZ = o => ({ start: o.s.slice(0, 16), koniec: o.k.slice(0, 16) }), odcDo = o => ({ s: o.start, k: o.koniec });
  function wpisZJson(o) {
    return mkWpis({ data: o.data, rodzaj: o.rodzaj || 'PRACA', praca: o.praca ? odcZ(o.praca) : null, przerwy: (o.przerwy || []).map(odcZ),
      miejsce: o.miejsce || 'BUDOWA', nazwaMiejsca: o.nazwaMiejsca || '', notatka: o.notatka || '', gpsStart: o.gpsStart || null, gpsKoniec: o.gpsKoniec || null,
      kmOdWarsztatu: o.kmOdW ?? null, kmTrasy: o.kmTrasy ?? null, podrozMin: o.podroz ?? null,
      delegacja: o.delegacja === 'tak' ? true : o.delegacja === 'nie' ? false : null });
  }
  function wpisDoJson(w) {
    const o = { data: w.data, rodzaj: w.rodzaj, miejsce: w.miejsce, nazwaMiejsca: w.nazwaMiejsca, notatka: w.notatka, przerwy: w.przerwy.map(odcDo),
      delegacja: w.delegacja === true ? 'tak' : w.delegacja === false ? 'nie' : 'auto' };
    if (w.praca) o.praca = odcDo(w.praca);
    if (w.gpsStart) o.gpsStart = w.gpsStart; if (w.gpsKoniec) o.gpsKoniec = w.gpsKoniec;
    if (w.kmOdWarsztatu != null) o.kmOdW = w.kmOdWarsztatu; if (w.kmTrasy != null) o.kmTrasy = w.kmTrasy; if (w.podrozMin != null) o.podroz = w.podrozMin;
    return o;
  }
  const M = {
    wpisy() {
      const surowe = ls.get('wpisy', []);
      const ok = []; surowe.forEach(o => { try { ok.push(wpisZJson(o)); } catch (e) { } });
      if (ok.length < surowe.length) ls.set('wpisy_kopia_bledne', surowe);
      return ok.sort((a, b) => a.data < b.data ? -1 : 1);
    },
    zapiszWpisy(w) { ls.set('wpisy', [...w].sort((a, b) => a.data < b.data ? -1 : 1).map(wpisDoJson)); },
    dodaj(w) { M.zapiszWpisy(M.wpisy().filter(x => x.data !== w.data).concat([w])); },
    usun(d) { M.zapiszWpisy(M.wpisy().filter(x => x.data !== d)); },
    profilJson() { return ls.get('profil', null); },
    profil() {
      const o = M.profilJson(); if (!o) return mkProfil({});
      try {
        return mkProfil({ nazwa: o.nazwa, godzinyUmowneTydzien: o.umowa, dniRoboczeTydzien: o.dni, limitUstawowyTydzien: o.limit, stawkaGodzinowa: o.stawka,
          doplataUeberstundenProc: o.dUst, doplataUeberzeitProc: o.dUz, doplataNocProc: o.dNoc, doplataNiedzielaProc: o.dNd, doplataSwietoProc: o.dSw,
          dniUrlopu: o.urlop, trzynastka: o.trzynastka, kanton: o.kanton, warsztat: o.wLat != null ? { lat: o.wLat, lon: o.wLon } : null,
          progDelegacjiKm: o.prog, dietaDzienna: o.dieta, wspolczynnikDrogi: o.wsp ?? 1.25, dojazdDoWarsztatuMin: o.dojazd ?? 0,
          nadgodzinyRoczneLgav: o.lgav ?? true, limitWyplatyBezDoplaty: o.limitBez ?? 100 });
      } catch (e) { return mkProfil({}); }
    },
    zapiszProfil(p) {
      const o = { nazwa: p.nazwa, umowa: p.godzinyUmowneTydzien, dni: p.dniRoboczeTydzien, limit: p.limitUstawowyTydzien, stawka: p.stawkaGodzinowa,
        dUst: p.doplataUeberstundenProc, dUz: p.doplataUeberzeitProc, dNoc: p.doplataNocProc, dNd: p.doplataNiedzielaProc, dSw: p.doplataSwietoProc,
        urlop: p.dniUrlopu, trzynastka: p.trzynastka, kanton: p.kanton, prog: p.progDelegacjiKm, dieta: p.dietaDzienna, wsp: p.wspolczynnikDrogi,
        dojazd: p.dojazdDoWarsztatuMin, lgav: p.nadgodzinyRoczneLgav, limitBez: p.limitWyplatyBezDoplaty };
      if (p.warsztat) { o.wLat = p.warsztat.lat; o.wLon = p.warsztat.lon; }
      ls.set('profil', o);
    },
    sesja() { return ls.get('sesja', null); },
    zapiszSesje(s) { if (s) ls.set('sesja', s); else LS.removeItem('gch_sesja'); },
    eksport() { return JSON.stringify({ wersja: 1, profil: M.profilJson() || {}, wpisy: ls.get('wpisy', []) }, null, 2); },
    importuj(txt) {
      const o = JSON.parse(txt), nowe = (o.wpisy || []).map(wpisZJson);
      ls.set('wpisy_przed_importem', ls.get('wpisy', [])); ls.set('profil_przed_importem', M.profilJson());
      M.zapiszWpisy(nowe); if (o.profil && Object.keys(o.profil).length) ls.set('profil', o.profil);
      return nowe.length;
    },
  };
  // Prośba o trwałe przechowywanie (Safari nie usuwa danych aplikacji dodanej do ekranu początkowego).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });

  // ---------- GPS (tylko gdy aplikacja jest otwarta – ograniczenie iOS dla aplikacji webowych) ----------
  const G = {
    id: null, ostatni: null,
    punkty() { return ls.get('trasa', []); },
    dopisz(g) { const p = G.punkty(); p.push({ gps: g, czasMs: Date.now() }); ls.set('trasa', p.slice(-3000)); },
    start() {
      if (!navigator.geolocation || G.id !== null) return;
      G.id = navigator.geolocation.watchPosition(pos => {
        const g = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
        if (Date.now() - pos.timestamp > 30000) return; // stara pozycja z pamięci (np. z domu) zafałszowałaby dietę
        G.ostatni = { g, czas: Date.now() };
        if (M.sesja() && pos.coords.accuracy <= 100) G.dopisz(g);
      }, () => { }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
    },
    stop() { if (G.id !== null) navigator.geolocation.clearWatch(G.id); G.id = null; },
    swieza() { return G.ostatni && Date.now() - G.ostatni.czas < 120000 && G.ostatni.g.acc <= 100 ? G.ostatni.g : null; },
    jednorazowo() {
      return new Promise(res => {
        if (!navigator.geolocation) return res(null);
        navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => res(null),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });
    },
  };

  // ---------- raport tekstowy (port Raport.kt) ----------
  function raport(r, p, rok, mies, wpisy, uzWcz) {
    const b = (de, pl, en, it) => j === 'de' ? de : de + ' / ' + ({ pl, en, it })[j];
    const lab = (de, pl, en, it, s = 42) => (b(de, pl, en, it) + ':').padEnd(s);
    const L = [], f2 = x => x.toFixed(2);
    L.push(b('ARBEITSZEITRAPPORT', 'RAPORT GODZIN PRACY', 'WORKING TIME REPORT', 'RAPPORTO ORE DI LAVORO'));
    L.push(b('Monat', 'Miesiąc', 'Month', 'Mese') + `: ${String(mies).padStart(2, '0')}.${rok}   Profil: ${p.nazwa}`);
    L.push(b('Vertrag', 'Umowa', 'Contract', 'Contratto') + `: ${p.godzinyUmowneTydzien.toFixed(1)} Std./Woche, Höchstarbeitszeit ${p.limitUstawowyTydzien} Std. (ArG Art. 9)`);
    L.push('', 'Datum       Tag  Beginn Ende  Pause  Arbeit  Art');
    const dni = new Set(r.tygodnie.flatMap(x => x.dni.map(d => d.data)));
    wpisy.filter(w => dni.has(w.data)).forEach(w => {
      const d = K.dzien(w, p), rodz = j === 'de' ? RODZAJE[w.rodzaj].de : RODZAJE[w.rodzaj].de + '/' + RODZAJE[w.rodzaj][j];
      L.push(`${dmy(w.data)}  ${dzienTyg(w.data, 'de')}   ${w.praca ? godz(w.praca.start) : '  -  '}  ${w.praca ? godz(w.praca.koniec) : '  -  '}  ${String(d.minutyPrzerw).padStart(3)}'  ${(d.minutyZaliczone / 60).toFixed(2).padStart(5)}   ${rodz}` +
        (w.nazwaMiejsca ? ' – ' + w.nazwaMiejsca : '') + (K.czyDelegacja(w, p) ? ' [auswärts' + (w.kmOdWarsztatu != null ? ' ' + (w.kmOdWarsztatu * p.wspolczynnikDrogi).toFixed(0) + ' km' : '') + ']' : ''));
    });
    L.push('', b('Woche', 'Tydzień', 'Week', 'Settimana').padEnd(16) + 'Total   Überstunden   Überzeit');
    r.tygodnie.forEach(x => L.push(`KW ${String(x.tydzien).padStart(2)}          ${f2(x.godzinyRazem).padStart(6)}   ${f2(x.ueberstunden).padStart(6)}        ${f2(x.ueberzeit).padStart(6)}`));
    L.push('', lab('Total Stunden', 'Godziny razem', 'Total hours', 'Ore totali') + f2(r.godzinyRazem).padStart(7));
    L.push(lab('Normalstunden', 'Podstawowe', 'Regular hours', 'Ore ordinarie') + f2(r.godzinyPodstawowe).padStart(7));
    L.push(lab('Überstunden (OR 321c)', 'Nadgodziny', 'Overtime', 'Ore supplementari') + f2(r.ueberstunden).padStart(7));
    L.push(lab('Überzeit (ArG Art. 12/13)', 'Ponad limit ustawowy', 'Above statutory limit', 'Lavoro straordinario') + f2(r.ueberzeit).padStart(7));
    if (p.nadgodzinyRoczneLgav) {
      const rr = K.rok(wpisy, rok, p, koniecMies(rok, mies));
      L.push(b('Überstundensaldo im Jahr (LGAV Art. 40)', 'saldo nadgodzin w roku', 'annual overtime balance', 'saldo annuo ore suppl.') + `: ${rr.saldo >= 0 ? '+' : ''}${f2(rr.saldo)} Std.` +
        (rr.zDoplata > 0 ? ` – über 100 Std.: ${f2(rr.zDoplata)} Std., Zuschlag CHF ${f2(rr.kwotaDoplaty)}` : ''));
    }
    L.push(b('Überzeit im Jahr', 'Überzeit w roku', 'Überzeit this year', "Überzeit nell'anno") + `: ${f2(uzWcz + r.ueberzeit)} / ${p.rocznyLimitUeberzeit} Std.`);
    const podroz = wpisy.filter(w => dni.has(w.data)).reduce((s, w) => s + K.dzien(w, p).minutyPodrozy, 0) / 60;
    if (podroz > 0) L.push(b('Reisezeit als Arbeitszeit (LGAV Art. 25.2, enthalten)', 'podróż jako praca (wliczona)', 'travel as working time (included)', 'viaggio come lavoro (incluso)') + `: ${f2(podroz)} Std.`);
    L.push(b('Auswärtige Arbeit (Spesen, LGAV Art. 42)', 'delegacje', 'days away', 'giorni fuori sede') + `: ${r.dniDelegacji} × CHF ${f2(p.dietaDzienna)} = CHF ${f2(r.kwotaDiet)}`);
    L.push(b('Nacht / Sonntag / Feiertag', 'noc / niedziela / święto', 'night / Sunday / holiday', 'notte / domenica / festivo') + `:  ${f2(r.godzinyNocne)} / ${f2(r.godzinyNiedzielne)} / ${f2(r.godzinySwiateczne)}`);
    if (p.stawkaGodzinowa > 0) {
      const k = x => 'CHF ' + f2(x).padStart(10);
      L.push('', b('Stundenlohn', 'Stawka', 'Hourly rate', 'Tariffa oraria') + ': CHF ' + f2(p.stawkaGodzinowa));
      L.push(lab('Grundlohn', 'Podstawa', 'Base pay', 'Paga base') + k(r.kwotaPodstawowa));
      L.push(lab(p.nadgodzinyRoczneLgav ? 'Überstunden (Jahressaldo LGAV 40)' : `Überstunden +${p.doplataUeberstundenProc}%`, 'nadgodziny', 'overtime', 'supplementari') + k(r.kwotaUeberstunden));
      L.push(lab(`Überzeit +${p.doplataUeberzeitEfektywna}%`, 'ponad limit', 'above limit', 'straordinario') + k(r.kwotaUeberzeit));
      L.push(lab('Zuschläge Nacht/So/Feiertag', 'dopłaty', 'premiums', 'supplementi') + k(r.kwotaDoplatNoc + r.kwotaDoplatNiedziela + r.kwotaDoplatSwieto));
      L.push(lab(`Ferienentschädigung ${f2(p.doplataUrlopowaProc)}%`, 'urlop', 'holiday pay', 'vacanze') + k(r.kwotaUrlopowa));
      if (p.trzynastka) L.push(lab('13. Monatslohn 8.33%', '13. pensja', '13th salary', '13a mensilità') + k(r.kwotaTrzynastka));
      L.push(lab('TOTAL BRUTTO', 'RAZEM', 'TOTAL GROSS', 'TOTALE LORDO') + k(r.kwotaRazem));
      if (r.kwotaDiet > 0) L.push(lab('+ Spesen Mittagszulage', 'diety', 'allowance', 'indennità') + k(r.kwotaDiet));
    }
    if (r.ostrzezenia.length) { L.push('', b('Hinweise ArG', 'Naruszenia', 'Labour law notes', 'Avvisi LL') + ':'); r.ostrzezenia.forEach(o => L.push(`- ${dmy(o.data)}: ${j === 'de' ? o.de : o.de + ' / ' + o.tekst(j)}`)); }
    L.push('', 'Erstellt mit Godziny CH. Ohne Gewähr – keine Rechtsberatung.');
    return L.join('\n');
  }
  function koniecMies(rok, mies) { const k = new Date(Date.UTC(rok, mies, 0)).toISOString().slice(0, 10); return k > D.dzis() ? D.dzis() : k; }

  // ---------- interfejs ----------
  const $ = s => document.querySelector(s);
  let zakladka = ls.get('zakladka', 0), ym = [new Date().getFullYear(), new Date().getMonth() + 1], komunikat = '', wyplacono = '';
  function render() {
    document.documentElement.lang = j;
    const tabs = [['⏱', t('Dziś', 'Heute', 'Today', 'Oggi')], ['📋', t('Dziennik', 'Journal', 'Log', 'Diario')], ['📅', t('Miesiąc', 'Monat', 'Month', 'Mese')], ['⚙︎', t('Umowa', 'Vertrag', 'Contract', 'Contratto')]];
    $('#nav').innerHTML = tabs.map((x, i) => `<button class="${i === zakladka ? 'akt' : ''}" data-tab="${i}"><span>${x[0]}</span>${esc(x[1])}</button>`).join('');
    $('#ekran').innerHTML = [ekranDzis, ekranDziennik, ekranMiesiac, ekranUmowa][zakladka]();
    if (zakladka === 0) tik();
  }
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { zakladka = +tb.dataset.tab; ls.set('zakladka', zakladka); komunikat = ''; render(); window.scrollTo(0, 0); return; }
    const a = e.target.closest('[data-a]'); if (a) akcja(a.dataset.a, a.dataset.v, a);
  });

  // ----- DZIŚ -----
  let miejsceWybor = 'BUDOWA';
  function ekranDzis() {
    const p = M.profil(), s = M.sesja(), dz = D.dzis(), sw = Swieta.nazwa(dz, p.kanton, j);
    let x = `<p class="c duzy">${dmy(dz)} (${dzienTyg(dz)})</p>` + (sw ? `<p class="c czer">${t('Dziś święto: ', 'Heute Feiertag: ', 'Public holiday today: ', 'Oggi è festivo: ')}${esc(sw)}</p>` : '');
    if (!s) {
      x += `<div class="chipy">${Object.keys(MIEJSCA).map(k => `<button class="chip ${k === miejsceWybor ? 'wyb' : ''}" data-a="miejsce" data-v="${k}">${MIEJSCA[k][j]}</button>`).join('')}</div>
        <input id="nazwa" placeholder="${t('Budowa / adres (opcjonalnie)', 'Baustelle / Adresse (optional)', 'Site / address (optional)', 'Cantiere / indirizzo (facoltativo)')}">
        <button class="wielki ziel" data-a="start">START</button>`;
    } else {
      x += `<p class="c">Start: ${godz(s.start)} • ${MIEJSCA[s.miejsce][j]}${s.nazwaMiejsca ? ' – ' + esc(s.nazwaMiejsca) : ''}</p>
        <p class="c licznik" id="licznik">0:00</p><p class="c" id="przerwyInfo"></p><p class="c czer" id="wymPrzerwa"></p><p class="c maly" id="gpsInfo"></p>`;
      x += s.przerwaOd ? `<p class="c pom">${t('Przerwa od ', 'Pause seit ', 'Break since ', 'Pausa dalle ')}${godz(s.przerwaOd)}</p><button class="wielki nieb" data-a="koniecPrzerwy">${t('KONIEC PRZERWY', 'PAUSE ENDE', 'END BREAK', 'FINE PAUSA')}</button>`
        : `<button class="wielki pom" data-a="przerwa">${t('PRZERWA', 'PAUSE', 'BREAK', 'PAUSA')}</button>`;
      x += `<button class="wielki czer" data-a="koniec">${t('KONIEC PRACY', 'FEIERABEND', 'END WORK', 'FINE LAVORO')}</button>
        <button class="tekst" data-a="anuluj">${t('Anuluj (bez zapisu)', 'Abbrechen (ohne Speichern)', "Cancel (don't save)", 'Annulla (senza salvare)')}</button>
        <p class="maly szary">${t('iPhone zapisuje GPS tylko przy otwartej aplikacji – otwórz ją na budowie, żeby policzyć dietę.', 'Das iPhone speichert GPS nur bei geöffneter App – auf der Baustelle kurz öffnen, damit die Spesen berechnet werden.', 'iPhone records GPS only while the app is open – open it at the site so the allowance can be calculated.', "L'iPhone registra il GPS solo con l'app aperta – aprila in cantiere per calcolare l'indennità.")}</p>`;
    }
    if (komunikat) x += `<p class="c ${komunikat[0] === '!' ? 'czer' : 'ziel'}">${esc(komunikat.replace(/^!/, ''))}</p>`;
    // tydzień
    const pon = D.dodaj(dz, 1 - D.dzienTyg(dz)), w = M.wpisy().filter(x => x.data >= pon && x.data <= D.dodaj(pon, 6));
    if (w.length) { const r = K.okres(w, p); x += `<div class="karta"><b>${t('Ten tydzień', 'Diese Woche', 'This week', 'Questa settimana')}</b><br>${t('Razem: ', 'Total: ', 'Total: ', 'Totale: ')}${h(r.godzinyRazem)} (${t('umowa', 'Vertrag', 'contract', 'contratto')} ${h(p.godzinyUmowneTydzien)})` +
      (r.ueberstunden > 0 ? `<br>Überstunden: ${h(r.ueberstunden)}` : '') + (r.ueberzeit > 0 ? `<br><span class="czer">Überzeit: ${h(r.ueberzeit)}</span>` : '') + '</div>'; }
    return x;
  }
  function tik() {
    const s = M.sesja(); if (!s || zakladka !== 0 || !$('#licznik')) return;
    const teraz = D.teraz(), brutto = D.min(s.start, teraz);
    const prz = s.przerwy.reduce((a, o) => a + D.min(o.start, o.koniec), 0) + (s.przerwaOd ? D.min(s.przerwaOd, teraz) : 0);
    const netto = brutto - prz, wym = K.minimalnaPrzerwa(netto), p = M.profil();
    $('#licznik').textContent = hm(netto);
    $('#przerwyInfo').textContent = t('praca netto • przerwy: ', 'Arbeit netto • Pausen: ', 'net work • breaks: ', 'lavoro netto • pause: ') + hm(prz);
    $('#wymPrzerwa').textContent = prz < wym ? t(`Wymagana przerwa: min. ${wym} min (ArG 15)`, `Pflichtpause: mind. ${wym} Min. (ArG 15)`, `Required break: at least ${wym} min (ArG 15)`, `Pausa obbligatoria: almeno ${wym} min (LL 15)`) : '';
    const pk = G.punkty(), km = p.warsztat ? Geo.odlegloscMiejscaPracy(pk, p.warsztat) : null;
    $('#gpsInfo').textContent = `📍 GPS: ${pk.length} ` + t('pkt', 'Pkt.', 'pts', 'punti') + (km != null ? ' • ' + t('miejsce pracy ~', 'Arbeitsort ~', 'workplace ~', 'luogo di lavoro ~') + km.toFixed(1) + ' km' : '') +
      (km != null && km * p.wspolczynnikDrogi > p.progDelegacjiKm ? ' • 🚐 auswärts ' + chf(p.dietaDzienna) : '') + (!p.warsztat ? ' • ' + t('ustaw warsztat w „Umowa”', 'Werkstatt im „Vertrag“ setzen', 'set workshop in “Contract”', "imposta l'officina in «Contratto»") : '');
  }
  setInterval(tik, 1000);

  // ----- DZIENNIK -----
  function ekranDziennik() {
    const p = M.profil(), w = M.wpisy().reverse();
    let x = `<div class="wiersz"><h2>${t('Dziennik', 'Journal', 'Log', 'Diario')} (${w.length})</h2><button class="maly-btn" data-a="nowy">＋ ${t('Dodaj dzień', 'Tag hinzufügen', 'Add day', 'Aggiungi giorno')}</button></div>`;
    w.forEach(e => {
      const d = K.dzien(e, p), del = K.czyDelegacja(e, p);
      x += `<div class="poz" data-a="edytuj" data-v="${e.data}"><div class="wiersz"><b>${dmy(e.data)} ${dzienTyg(e.data)}${d.swieto ? ' 🎌' : ''}</b><b>${hm(d.minutyZaliczone)}</b></div>
        <div>${e.praca ? godz(e.praca.start) + '–' + godz(e.praca.koniec) + ' ' + t('przerwa', 'Pause', 'break', 'pausa') + ' ' + d.minutyPrzerw + ' min • ' + MIEJSCA[e.miejsce][j] + (e.nazwaMiejsca ? ' ' + esc(e.nazwaMiejsca) : '') : RODZAJE[e.rodzaj][j]}</div>` +
        (del || e.kmOdWarsztatu != null ? `<div class="nieb maly">${del ? '🚐 auswärts • ' + chf(p.dietaDzienna) + ' ' : ''}${e.kmOdWarsztatu != null ? e.kmOdWarsztatu.toFixed(1) + ' km' : ''}</div>` : '') +
        (d.minutyPodrozy ? `<div class="nieb maly">🚗 ${t('podróż zaliczona do pracy: ', 'Reisezeit als Arbeitszeit: ', 'travel counted as work: ', 'viaggio contato come lavoro: ')}${hm(d.minutyPodrozy)} (LGAV 25.2)</div>` : '') +
        d.ostrzezenia.map(o => `<div class="czer maly">⚠ ${esc(o.tekst(j))}</div>`).join('') + '</div>';
    });
    return x;
  }
  function edycja(w) {
    const nowy = !w; w = w || { data: D.dzis(), rodzaj: 'PRACA', praca: { start: D.dzis() + 'T07:00', koniec: D.dzis() + 'T17:00' }, przerwy: [{ start: D.dzis() + 'T12:00', koniec: D.dzis() + 'T13:00' }], miejsce: 'BUDOWA', nazwaMiejsca: '', notatka: '', delegacja: null, podrozMin: null };
    const prz = w.przerwy.reduce((a, o) => a + D.min(o.start, o.koniec), 0);
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form method="dialog"><h3>${nowy ? t('Nowy dzień', 'Neuer Tag', 'New day', 'Nuovo giorno') : t('Edycja dnia', 'Tag bearbeiten', 'Edit day', 'Modifica giorno')}</h3>
      <label>${t('Data', 'Datum', 'Date', 'Data')}<input type="date" name="data" value="${w.data}" required></label>
      <select name="rodzaj">${Object.keys(RODZAJE).map(k => `<option value="${k}" ${k === w.rodzaj ? 'selected' : ''}>${RODZAJE[k][j]}</option>`).join('')}</select>
      <div class="praca"><div class="dwa"><label>${t('Od', 'Von', 'From', 'Dalle')}<input type="time" name="od" value="${w.praca ? godz(w.praca.start) : '07:00'}"></label>
      <label>${t('Do', 'Bis', 'To', 'Alle')}<input type="time" name="do" value="${w.praca ? godz(w.praca.koniec) : '17:00'}"></label></div>
      <div class="dwa"><label>${t('Przerwa min', 'Pause Min.', 'Break min', 'Pausa min')}<input type="number" inputmode="numeric" name="prz" value="${prz}"></label>
      <label>${t('Przerwa od', 'Pause ab', 'Break from', 'Pausa dalle')}<input type="time" name="przOd" value="${w.przerwy[0] ? godz(w.przerwy[0].start) : '12:00'}"></label></div>
      <p class="maly">${t('Koniec wcześniej niż start = praca do następnego dnia (noc).', 'Ende vor Beginn = Arbeit bis zum nächsten Tag (Nacht).', 'End earlier than start = work into the next day (night).', "Fine prima dell'inizio = lavoro fino al giorno dopo (notte).")}</p>
      <select name="miejsce">${Object.keys(MIEJSCA).map(k => `<option value="${k}" ${k === w.miejsce ? 'selected' : ''}>${MIEJSCA[k][j]}</option>`).join('')}</select>
      <input name="nazwa" value="${esc(w.nazwaMiejsca)}" placeholder="${t('Budowa / adres', 'Baustelle / Adresse', 'Site / address', 'Cantiere / indirizzo')}">
      <label>${t('Praca auswärts (>15 km – dieta)', 'Auswärtige Arbeit (>15 km – Spesen)', 'Working away (>15 km – allowance)', 'Lavoro fuori sede (>15 km – indennità)')}<select name="del">
        <option value="auto" ${w.delegacja == null ? 'selected' : ''}>Auto (GPS)</option><option value="tak" ${w.delegacja === true ? 'selected' : ''}>${t('Tak', 'Ja', 'Yes', 'Sì')}</option><option value="nie" ${w.delegacja === false ? 'selected' : ''}>${t('Nie', 'Nein', 'No', 'No')}</option></select></label>
      <label>${t('Podróż dom↔budowa poza START–KONIEC (min, razem)', 'Reise Wohnort↔Baustelle ausserhalb START–ENDE (Min., total)', 'Travel home↔site outside START–END (min, total)', 'Viaggio casa↔cantiere fuori START–FINE (min, totale)')}<input type="number" inputmode="numeric" name="podroz" value="${w.podrozMin ?? ''}"></label></div>
      <input name="notatka" value="${esc(w.notatka)}" placeholder="${t('Notatka', 'Notiz', 'Note', 'Nota')}"><p class="czer" id="blad"></p>
      <div class="wiersz">${nowy ? '<span></span>' : `<button type="button" class="tekst czer" id="usun">${t('Usuń', 'Löschen', 'Delete', 'Elimina')}</button>`}
      <span><button type="button" class="tekst" id="anuluj">${t('Anuluj', 'Abbrechen', 'Cancel', 'Annulla')}</button><button class="maly-btn" id="zapisz">${t('Zapisz', 'Speichern', 'Save', 'Salva')}</button></span></div></form>`;
    document.body.appendChild(dlg);
    const f = dlg.querySelector('form'), pokaz = () => { dlg.querySelector('.praca').style.display = f.rodzaj.value === 'PRACA' ? '' : 'none'; };
    f.rodzaj.onchange = pokaz; pokaz();
    const zamknij = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('#anuluj').onclick = zamknij;
    const u = dlg.querySelector('#usun');
    if (u) u.onclick = () => { if (confirm(t('Usunąć ten dzień?', 'Diesen Tag löschen?', 'Delete this day?', 'Eliminare questo giorno?'))) { M.usun(w.data); zamknij(); render(); } };
    f.onsubmit = ev => {
      ev.preventDefault();
      try {
        const d = f.data.value; let nw;
        if (f.rodzaj.value !== 'PRACA') nw = mkWpis({ data: d, rodzaj: f.rodzaj.value, notatka: f.notatka.value });
        else {
          const s = d + 'T' + f.od.value; let k = d + 'T' + f.do.value; if (D.ms(k) <= D.ms(s)) k = D.dodaj(d, 1) + 'T' + f.do.value;
          const pm = +f.prz.value || 0; let przerwy = [];
          if (pm > 0) { let ps = d + 'T' + f.przOd.value; if (D.ms(ps) < D.ms(s)) ps = D.dodaj(d, 1) + 'T' + f.przOd.value; przerwy = [{ start: ps, koniec: D.dodajMin(ps, pm) }]; }
          nw = mkWpis({ data: d, rodzaj: 'PRACA', praca: { start: s, koniec: k }, przerwy, miejsce: f.miejsce.value, nazwaMiejsca: f.nazwa.value, notatka: f.notatka.value,
            gpsStart: w.gpsStart, gpsKoniec: w.gpsKoniec, kmOdWarsztatu: w.kmOdWarsztatu ?? null, kmTrasy: w.kmTrasy ?? null,
            delegacja: f.del.value === 'tak' ? true : f.del.value === 'nie' ? false : null, podrozMin: +f.podroz.value > 0 ? +f.podroz.value : null });
        }
        if (!nowy && w.data !== d) M.usun(w.data);
        M.dodaj(nw); zamknij(); render();
      } catch (e) { dlg.querySelector('#blad').textContent = e.message; }
    };
    dlg.showModal();
  }

  // ----- MIESIĄC -----
  function ekranMiesiac() {
    const p = M.profil(), wsz = M.wpisy(), [rok, mies] = ym;
    let wcz = 0; for (let m = 1; m < mies; m++) wcz += K.miesiac(wsz, rok, m, p).ueberzeit;
    const r = K.miesiac(wsz, rok, mies, p, wcz), L = (a, b, g) => `<div class="linia ${g ? 'gruba' : ''}"><span>${a}</span><span>${b}</span></div>`;
    let x = `<div class="wiersz"><button class="tekst duzy" data-a="mies" data-v="-1">◀</button><h2>${MIES[j][mies - 1]} ${rok}</h2><button class="tekst duzy" data-a="mies" data-v="1">▶</button></div>
      <p class="maly">${t('Tygodnie przypisane do miesiąca wg czwartku (ISO).', 'Wochen werden dem Monat nach dem Donnerstag zugeordnet (ISO).', 'Weeks are assigned to the month by their Thursday (ISO).', 'Le settimane sono assegnate al mese in base al giovedì (ISO).')}</p>`;
    r.tygodnie.forEach(w => x += `<div class="linia ${w.ueberzeit > 0 ? 'tlo-czer' : ''}"><span>${t('Tydz. ', 'KW ', 'Wk ', 'Sett. ')}${w.tydzien}</span><span>${h(w.godzinyRazem)}</span><span>Üst ${h(w.ueberstunden)}</span><span>Üz ${h(w.ueberzeit)}</span></div>`);
    x += '<hr>' + L(t('Godziny razem', 'Stunden total', 'Total hours', 'Ore totali'), h(r.godzinyRazem), 1) +
      L(t('Podstawowe', 'Normalstunden', 'Regular', 'Ordinarie') + ` (${p.godzinyUmowneTydzien} h)`, h(r.godzinyPodstawowe)) +
      L(`Überstunden (${p.godzinyUmowneTydzien}–${p.limitUstawowyTydzien} h) ` + (p.nadgodzinyRoczneLgav ? '→ ' + t('saldo roczne', 'Jahressaldo', 'annual balance', 'saldo annuo') : `+${p.doplataUeberstundenProc} %`), h(r.ueberstunden)) +
      L(`Überzeit (> ${p.limitUstawowyTydzien} h) +${p.doplataUeberzeitEfektywna} %`, h(r.ueberzeit)) +
      L(t('Nocne / niedzielne / świąteczne', 'Nacht / Sonntag / Feiertag', 'Night / Sunday / holiday', 'Notte / domenica / festivo'), h(r.godzinyNocne) + ' / ' + h(r.godzinyNiedzielne) + ' / ' + h(r.godzinySwiateczne)) +
      L(t('Überzeit w roku', 'Überzeit im Jahr', 'Überzeit this year', "Überzeit nell'anno") + ` (limit ${p.rocznyLimitUeberzeit} h)`, h(wcz + r.ueberzeit));
    if (p.nadgodzinyRoczneLgav) {
      const rr = K.rok(wsz, rok, p, koniecMies(rok, mies));
      x += L(t('Saldo nadgodzin w roku (LGAV art. 40)', 'Überstundensaldo im Jahr (LGAV Art. 40)', 'Annual overtime balance (LGAV Art. 40)', 'Saldo annuo ore supplementari (CCL art. 40)'), (rr.saldo >= 0 ? '+' : '') + h(rr.saldo), 1);
      x += `<p class="maly szary">${t('Saldo liczy tylko wpisane dni – wpisuj też urlop, chorobę i święta.', 'Das Saldo zählt nur erfasste Tage – auch Ferien, Krankheit und Feiertage eintragen.', 'The balance counts only logged days – also log holidays, sick leave and public holidays.', 'Il saldo conta solo i giorni registrati – registra anche ferie, malattia e festivi.')}</p>`;
      if (rr.zDoplata > 0) x += `<p class="czer maly">${t('Ponad 100 h', 'Über 100 Std.', 'Above 100 h', 'Oltre 100 h')}: ${h(rr.zDoplata)} → ${t('dopłata przy wypłacie', 'Zuschlag bei Auszahlung', 'premium if paid out', 'supplemento se pagate')} ${chf(rr.kwotaDoplaty)}</p>`;
    }
    x += L(t('Dni pracy auswärts (dieta)', 'Tage auswärts (Spesen)', 'Days away (allowance)', 'Giorni fuori sede (indennità)'), `${r.dniDelegacji} × ${chf(p.dietaDzienna)} = ${chf(r.kwotaDiet)}`, 1);
    if (p.stawkaGodzinowa > 0) {
      x += `<hr><b>${t('Wynagrodzenie brutto', 'Bruttolohn', 'Gross pay', 'Salario lordo')} (${chf(p.stawkaGodzinowa)}/h)</b>` + L(t('Podstawa', 'Grundlohn', 'Base pay', 'Paga base'), chf(r.kwotaPodstawowa)) +
        L('Überstunden', chf(r.kwotaUeberstunden)) + L('Überzeit', chf(r.kwotaUeberzeit)) +
        L(t('Dopłaty noc/niedz./święto', 'Zuschläge Nacht/So/Feiertag', 'Night/Sunday/holiday premiums', 'Supplementi notte/dom./festivi'), chf(r.kwotaDoplatNoc + r.kwotaDoplatNiedziela + r.kwotaDoplatSwieto)) +
        L(t('Dodatek urlopowy', 'Ferienentschädigung', 'Holiday pay', 'Indennità vacanze') + ` ${p.doplataUrlopowaProc.toFixed(2)} %`, chf(r.kwotaUrlopowa)) +
        (p.trzynastka ? L(t('13. pensja 8,33 %', '13. Monatslohn 8,33 %', '13th-month salary 8.33 %', '13a mensilità 8,33 %'), chf(r.kwotaTrzynastka)) : '') +
        L(t('RAZEM brutto', 'TOTAL brutto', 'TOTAL gross', 'TOTALE lordo'), chf(r.kwotaRazem), 1) + (r.kwotaDiet > 0 ? L('+ Spesen', chf(r.kwotaDiet), 1) : '') +
        `<label>${t('Brutto z odcinka wypłaty (CHF)', 'Brutto laut Lohnabrechnung (CHF)', 'Gross from payslip (CHF)', 'Lordo dalla busta paga (CHF)')}<input id="wypl" inputmode="decimal" value="${esc(wyplacono)}"></label><p id="roznica" class="duzy"></p>`;
    } else x += `<p class="czer">${t('Wpisz stawkę godzinową w zakładce „Umowa”, aby liczyć kwoty.', 'Stundenlohn unter „Vertrag“ eingeben, um Beträge zu berechnen.', 'Enter your hourly rate in the “Contract” tab to calculate amounts.', 'Inserisci la tariffa oraria alla voce «Contratto» per calcolare gli importi.')}</p>`;
    if (r.ostrzezenia.length) x += `<hr><b class="czer">${t('Naruszenia prawa pracy', 'Verstösse gegen das Arbeitsgesetz', 'Labour law violations', 'Violazioni della legge sul lavoro')} (${r.ostrzezenia.length})</b>` + r.ostrzezenia.map(o => `<div class="maly">${dmy(o.data)}: ${esc(o.tekst(j))}</div>`).join('');
    x += `<button class="szeroki" data-a="raport">📄 ${t('Raport (wyślij / PDF)', 'Rapport (senden / PDF)', 'Report (send / PDF)', 'Rapporto (invia / PDF)')}</button>
      <p class="maly szary">${t('Raport: po niemiecku + w wybranym języku. PDF: Udostępnij → Drukuj → rozsuń podgląd dwoma palcami → Udostępnij → Zapisz w Plikach.', 'Rapport auf Deutsch. PDF: Teilen → Drucken → Vorschau mit zwei Fingern aufziehen → Teilen → In Dateien sichern.', 'Report: German + English. PDF: Share → Print → pinch out the preview → Share → Save to Files.', 'Rapporto: tedesco + italiano. PDF: Condividi → Stampa → allarga l’anteprima con due dita → Condividi → Salva su File.')}</p>`;
    setTimeout(() => { const i = $('#wypl'); if (i) { const licz = () => { wyplacono = i.value; const v = parseFloat(i.value.replace(',', '.').replace(/'/g, '')); const el = $('#roznica'); if (isNaN(v)) { el.textContent = ''; return; } const d = r.kwotaRazem - v;
      el.textContent = d > 0.5 ? t('BRAKUJE: ', 'ES FEHLEN: ', 'MISSING: ', 'MANCANO: ') + chf(d) : d < -0.5 ? t('Wypłacono więcej o ', 'Mehr ausbezahlt um ', 'Paid more by ', 'Pagato in eccesso: ') + chf(-d) : t('Zgadza się ✔', 'Stimmt ✔', 'Matches ✔', 'Corrisponde ✔');
      el.className = 'duzy ' + (d > 0.5 ? 'czer' : 'ziel'); }; i.oninput = licz; licz(); } }, 0);
    return x;
  }

  // ----- UMOWA -----
  function ekranUmowa() {
    const p = M.profil(), P = (id, et, v, opis = '') => `<label>${et}<input id="${id}" inputmode="decimal" value="${v}"></label>${opis ? `<p class="maly szary">${opis}</p>` : ''}`;
    const ust = t('ustawowo min.', 'gesetzlich mind.', 'legal minimum', 'minimo legale');
    return `<b>🌐 ${t('Język', 'Sprache', 'Language', 'Lingua')}</b><div class="chipy">${[['pl', 'Polski'], ['de', 'Deutsch'], ['en', 'English'], ['it', 'Italiano']].map(([k, n]) => `<button class="chip ${k === j ? 'wyb' : ''}" data-a="jezyk" data-v="${k}">${n}</button>`).join('')}</div><hr>
      <h2>${t('Dane z umowy o pracę', 'Angaben aus dem Arbeitsvertrag', 'Employment contract details', 'Dati del contratto di lavoro')}</h2>
      <label>${t('Nazwa profilu', 'Profilname', 'Profile name', 'Nome profilo')}<input id="pNazwa" value="${esc(p.nazwa)}"></label>
      ${P('pUmowa', t('Godziny w tygodniu wg umowy', 'Wochenstunden laut Vertrag', 'Weekly hours per contract', 'Ore settimanali da contratto'), p.godzinyUmowneTydzien, t('LGAV: 40 h (2086 h/rok) albo 41 h (2138 h/rok)', 'LGAV: 40 Std. (2086 Std./Jahr) oder 41 Std. (2138 Std./Jahr)', 'LGAV: 40 h (2,086 h/year) or 41 h (2,138 h/year)', 'CCL: 40 h (2086 h/anno) o 41 h (2138 h/anno)'))}
      ${P('pDni', t('Dni robocze w tygodniu', 'Arbeitstage pro Woche', 'Working days per week', 'Giorni lavorativi a settimana'), p.dniRoboczeTydzien)}
      <label>${t('Ustawowy limit tygodniowy (ArG art. 9)', 'Gesetzliche Höchstarbeitszeit (Art. 9 ArG)', 'Statutory weekly maximum (ArG Art. 9)', 'Durata massima legale settimanale (art. 9 LL)')}<select id="pLimit">
        <option value="45" ${p.limitUstawowyTydzien === 45 ? 'selected' : ''}>${t('45 h – przemysł, biuro', '45 Std. – Industrie, Büro', '45 h – industry, office', '45 h – industria, ufficio')}</option>
        <option value="50" ${p.limitUstawowyTydzien === 50 ? 'selected' : ''}>${t('50 h – budowa, rzemiosło', '50 Std. – Bau, Gewerbe', '50 h – construction, trades', '50 h – edilizia, artigianato')}</option></select></label>
      ${P('pStawka', t('Stawka godzinowa brutto (CHF)', 'Stundenlohn brutto (CHF)', 'Gross hourly rate (CHF)', 'Tariffa oraria lorda (CHF)'), p.stawkaGodzinowa || '', t('z odcinka wypłaty', 'laut Lohnabrechnung', 'from your payslip', 'dalla busta paga'))}
      <label class="chk"><input type="checkbox" id="pLgav" ${p.nadgodzinyRoczneLgav ? 'checked' : ''}> ${t('Nadgodziny jako saldo roczne (LGAV art. 40)', 'Überstunden als Jahressaldo (LGAV Art. 40)', 'Overtime as annual balance (LGAV Art. 40)', 'Ore supplementari come saldo annuo (CCL art. 40)')}</label>
      ${P('pUst', t('Dopłata Überstunden %', 'Zuschlag Überstunden %', 'Überstunden premium %', 'Supplemento Überstunden %'), p.doplataUeberstundenProc, 'OR 321c / LGAV 40: 25 %')}
      ${P('pUz', t('Dopłata Überzeit %', 'Zuschlag Überzeit %', 'Überzeit premium %', 'Supplemento Überzeit %'), p.doplataUeberzeitProc, ust + ' 25 %')}
      ${P('pNoc', t('Dopłata noc % (23–6)', 'Zuschlag Nacht % (23–6)', 'Night premium % (23–6)', 'Supplemento notte % (23–6)'), p.doplataNocProc, ust + ' 25 % • LGAV 50 %')}
      ${P('pNd', t('Dopłata niedziela %', 'Zuschlag Sonntag %', 'Sunday premium %', 'Supplemento domenica %'), p.doplataNiedzielaProc, ust + ' 50 % • LGAV 100 %')}
      ${P('pSw', t('Dopłata święto %', 'Zuschlag Feiertag %', 'Public holiday premium %', 'Supplemento festivo %'), p.doplataSwietoProc, ust + ' 50 % • LGAV 100 %')}
      ${P('pUrlop', t('Dni urlopu w roku', 'Ferientage pro Jahr', 'Holiday days per year', "Giorni di ferie all'anno"), p.dniUrlopu, t('LGAV art. 28: 23 (od 20 lat), 25 (od 50), 30 (od 60)', 'LGAV Art. 28: 23 (ab 20 J.), 25 (ab 50), 30 (ab 60)', 'LGAV Art. 28: 23 (age 20+), 25 (50+), 30 (60+)', 'CCL art. 28: 23 (dai 20 anni), 25 (dai 50), 30 (dai 60)'))}
      <label class="chk"><input type="checkbox" id="p13" ${p.trzynastka ? 'checked' : ''}> ${t('13. pensja (8,33 %)', '13. Monatslohn (8,33 %)', '13th-month salary (8.33 %)', '13a mensilità (8,33 %)')}</label>
      <label>${t('Kanton (święta)', 'Kanton (Feiertage)', 'Canton (public holidays)', 'Cantone (festivi)')}<input id="pKanton" value="${esc(p.kanton)}" maxlength="2"></label><hr>
      <b>${t('Delegacja / dieta (LGAV art. 42)', 'Auswärtige Arbeit / Spesen (LGAV Art. 42)', 'Working away / allowance (LGAV Art. 42)', 'Lavoro fuori sede / indennità (CCL art. 42)')}</b>
      <p class="maly" id="wInfo">${p.warsztat ? t('Warsztat', 'Werkstatt', 'Workshop', 'Officina') + `: ${p.warsztat.lat.toFixed(5)}, ${p.warsztat.lon.toFixed(5)}` : t('Warsztat nieustawiony – stań w warsztacie i naciśnij przycisk', 'Werkstatt nicht gesetzt – in der Werkstatt den Knopf drücken', 'Workshop not set – stand in the workshop and press the button', "Officina non impostata – mettiti in officina e premi il pulsante")}</p>
      <button class="szeroki obrys" data-a="warsztat">📍 ${t('Tu jest warsztat (moja lokalizacja)', 'Hier ist die Werkstatt (mein Standort)', 'The workshop is here (my location)', "L'officina è qui (la mia posizione)")}</button>
      ${P('pProg', t('Próg delegacji – km drogą od warsztatu', 'Schwelle auswärts – Wegkilometer ab Werkstatt', 'Away threshold – road km from workshop', "Soglia fuori sede – km stradali dall'officina"), p.progDelegacjiKm, 'LGAV: > 15 km')}
      ${P('pDieta', t('Mittagszulage CHF / dzień', 'Mittagszulage CHF / Tag', 'Lunch allowance CHF / day', 'Indennità pranzo CHF / giorno'), p.dietaDzienna, 'LGAV 2024–2027: CHF 18.–')}
      ${P('pDojazd', t('Zwykły dojazd dom → warsztat (min, w jedną stronę)', 'Normaler Arbeitsweg Wohnort → Werkstatt (Min., einfach)', 'Normal commute home → workshop (min, one way)', 'Tragitto normale casa → officina (min, sola andata)'), p.dojazdDoWarsztatuMin, 'LGAV art. 25.2')}
      <button class="szeroki" data-a="zapiszProfil">${t('ZAPISZ', 'SPEICHERN', 'SAVE', 'SALVA')}</button>
      <button class="tekst" data-a="domyslny">${t('Przywróć domyślne (Metallbau LGAV)', 'Standard wiederherstellen (Metallbau LGAV)', 'Restore defaults (Metallbau LGAV)', 'Ripristina predefiniti (Metallbau CCL)')}</button>
      ${komunikat ? `<p class="${komunikat[0] === '!' ? 'czer' : 'ziel'}">${esc(komunikat.replace(/^!/, ''))}</p>` : ''}<hr>
      <b>${t('Kopia zapasowa', 'Datensicherung', 'Backup', 'Backup')}</b><p class="maly szary">${t('Ten sam format co w aplikacji Android – możesz przenieść dane między telefonami.', 'Gleiches Format wie die Android-App – Daten lassen sich zwischen Telefonen übertragen.', 'Same format as the Android app – you can move data between phones.', "Stesso formato dell'app Android – puoi trasferire i dati tra telefoni.")}</p>
      <div class="dwa"><button class="obrys" data-a="eksport">${t('Zapisz kopię', 'Sichern', 'Save backup', 'Salva backup')}</button><label class="obrys plik">${t('Wczytaj kopię', 'Wiederherstellen', 'Load backup', 'Carica backup')}<input type="file" id="plik" accept="application/json,.json"></label></div>
      <p class="maly szary">Godziny CH • ${t('dane tylko w telefonie • ArG/OR/LGAV – to pomoc w liczeniu, nie porada prawna.', 'Daten nur im Telefon • ArG/OR/LGAV – Rechenhilfe, keine Rechtsberatung.', 'data stays on the phone • ArG/OR/LGAV – a calculation aid, not legal advice.', 'dati solo nel telefono • LL/CO/CCL – aiuto di calcolo, non consulenza legale.')}</p>`;
  }
  document.addEventListener('change', e => {
    if (e.target.id !== 'plik' || !e.target.files[0]) return;
    const fr = new FileReader();
    fr.onload = () => { try { if (!confirm(t('Wczytanie kopii zastąpi obecny dziennik (poprzedni stan zostanie zachowany). Kontynuować?', 'Das Laden ersetzt das aktuelle Journal (der vorherige Stand wird gesichert). Fortfahren?', 'Loading replaces the current log (the previous state is kept). Continue?', 'Il caricamento sostituisce il diario attuale (lo stato precedente resta salvato). Continuare?'))) return;
      const n = M.importuj(fr.result); komunikat = t(`Wczytano ${n} dni`, `${n} Tage geladen`, `${n} days loaded`, `${n} giorni caricati`); } catch (er) { komunikat = '!' + er.message; } render(); };
    fr.readAsText(e.target.files[0]);
  });

  // ---------- akcje ----------
  async function akcja(a, v) {
    const p = M.profil();
    if (a === 'jezyk') { j = v; ls.set('jezyk', v); komunikat = ''; render(); }
    else if (a === 'miejsce') { miejsceWybor = v; render(); }
    else if (a === 'start') {
      if (M.sesja()) return;
      ls.set('trasa', []); const nazwa = $('#nazwa').value;
      M.zapiszSesje({ start: D.teraz(), przerwy: [], przerwaOd: null, miejsce: miejsceWybor, nazwaMiejsca: nazwa }); komunikat = ''; render();
      G.start(); const g = await G.jednorazowo();
      if (g && g.acc <= 100) { G.dopisz(g); const s = M.sesja(); if (s) { s.gps = g; M.zapiszSesje(s); } }
      else if (!g) { komunikat = '!' + t('Brak lokalizacji – czas się liczy, ale dieta wymaga ręcznego wyboru.', 'Kein Standort – die Zeit läuft, Spesen bitte manuell wählen.', 'No location – time is counted, but choose the allowance manually.', "Nessuna posizione – il tempo conta, ma scegli l'indennità a mano."); render(); }
    }
    else if (a === 'przerwa') { const s = M.sesja(); s.przerwaOd = D.teraz(); M.zapiszSesje(s); render(); }
    else if (a === 'koniecPrzerwy') { const s = M.sesja(), k = D.teraz(); if (D.ms(k) > D.ms(s.przerwaOd)) s.przerwy.push({ start: s.przerwaOd, koniec: k }); s.przerwaOd = null; M.zapiszSesje(s); render(); }
    else if (a === 'koniec') {
      const s = M.sesja(), k = D.teraz(), g = await G.jednorazowo();
      if (g && g.acc <= 100) G.dopisz(g);
      const pk = G.punkty(), przerwy = s.przerwy.concat(s.przerwaOd && D.ms(k) > D.ms(s.przerwaOd) ? [{ start: s.przerwaOd, koniec: k }] : []);
      const fil = Geo.odfiltruj(pk).map(x => x.gps);
      try {
        let w = mkWpis({ data: D.data(s.start), rodzaj: 'PRACA', praca: { start: s.start, koniec: D.ms(k) > D.ms(s.start) ? k : s.start }, przerwy, miejsce: s.miejsce, nazwaMiejsca: s.nazwaMiejsca,
          gpsStart: s.gps || null, gpsKoniec: g, kmOdWarsztatu: p.warsztat ? Geo.odlegloscMiejscaPracy(pk, p.warsztat) : null, kmTrasy: fil.length > 1 ? Geo.dlugoscTrasy(fil) : null });
        const stary = M.wpisy().find(x => x.data === w.data && x.rodzaj === 'PRACA' && x.praca);
        if (stary) { // druga zmiana tego samego dnia – połącz (jak w Androidzie)
          const [aa, bb] = D.ms(stary.praca.start) <= D.ms(w.praca.start) ? [stary.praca, w.praca] : [w.praca, stary.praca];
          const luka = D.ms(bb.start) > D.ms(aa.koniec) ? [{ start: aa.koniec, koniec: bb.start }] : [];
          w = mkWpis(Object.assign({}, w, { praca: { start: aa.start, koniec: D.ms(aa.koniec) > D.ms(bb.koniec) ? aa.koniec : bb.koniec },
            przerwy: stary.przerwy.concat(w.przerwy, luka).sort((x, y) => D.ms(x.start) - D.ms(y.start)), gpsStart: stary.gpsStart || w.gpsStart,
            kmOdWarsztatu: (kms => kms.length ? Math.max(...kms) : null)([stary.kmOdWarsztatu, w.kmOdWarsztatu].filter(x => x != null)),
            notatka: [stary.notatka, w.notatka].filter(Boolean).join(' / ') }));
        }
        M.dodaj(w); M.zapiszSesje(null); ls.set('trasa', []); G.stop();
        komunikat = t('Zapisano dzień ', 'Tag gespeichert: ', 'Day saved: ', 'Giorno salvato: ') + dmy(w.data) + (stary ? t(' (połączono z wcześniejszym wpisem)', ' (mit früherem Eintrag zusammengeführt)', ' (merged with earlier entry)', ' (unito alla voce precedente)') : '');
      } catch (e) { komunikat = '!' + e.message; }
      render();
    }
    else if (a === 'anuluj') { if (confirm(t('Usunąć dzisiejszą pracę? Tego nie da się cofnąć.', 'Heutige Arbeit löschen? Das kann nicht rückgängig gemacht werden.', "Delete today's work? This cannot be undone.", 'Eliminare il lavoro di oggi? Non si può annullare.'))) { M.zapiszSesje(null); ls.set('trasa', []); G.stop(); render(); } }
    else if (a === 'nowy') edycja(null);
    else if (a === 'edytuj') edycja(M.wpisy().find(x => x.data === v));
    else if (a === 'mies') { let [r, m] = ym; m += +v; if (m < 1) { m = 12; r--; } if (m > 12) { m = 1; r++; } ym = [r, m]; render(); }
    else if (a === 'raport') {
      const wsz = M.wpisy(), [r, m] = ym; let wcz = 0; for (let i = 1; i < m; i++) wcz += K.miesiac(wsz, r, i, p).ueberzeit;
      const tekst = raport(K.miesiac(wsz, r, m, p, wcz), p, r, m, wsz, wcz), tytul = `Arbeitszeit ${String(m).padStart(2, '0')}/${r}`;
      const okno = document.createElement('dialog'); okno.className = 'pelny';
      okno.innerHTML = `<div class="wiersz"><button class="tekst" id="zam">✕</button><span><button class="maly-btn" id="udost">${t('Udostępnij', 'Teilen', 'Share', 'Condividi')}</button> <button class="maly-btn" id="druk">PDF / ${t('Drukuj', 'Drucken', 'Print', 'Stampa')}</button></span></div><pre id="tekstRap"></pre>`;
      document.body.appendChild(okno); okno.querySelector('#tekstRap').textContent = tekst; okno.showModal();
      okno.querySelector('#zam').onclick = () => { okno.close(); okno.remove(); };
      okno.querySelector('#druk').onclick = () => window.print();
      okno.querySelector('#udost').onclick = async () => { try { if (navigator.share) await navigator.share({ title: tytul, text: tekst }); else { await navigator.clipboard.writeText(tekst); alert(t('Skopiowano', 'Kopiert', 'Copied', 'Copiato')); } } catch (e) { } };
    }
    else if (a === 'warsztat') {
      $('#wInfo').textContent = '…'; const g = await G.jednorazowo();
      if (!g || g.acc > 100) { komunikat = '!' + t('Brak dokładnej lokalizacji – włącz usługi lokalizacji dla Safari i spróbuj ponownie', 'Kein genauer Standort – Ortungsdienste für Safari aktivieren und erneut versuchen', 'No precise location – enable Location Services for Safari and try again', 'Nessuna posizione precisa – attiva Localizzazione per Safari e riprova'); render(); return; }
      const o = M.profilJson() || {}; o.wLat = g.lat; o.wLon = g.lon; if (!M.profilJson()) { M.zapiszProfil(p); const o2 = M.profilJson(); o2.wLat = g.lat; o2.wLon = g.lon; ls.set('profil', o2); } else ls.set('profil', o);
      komunikat = t(`Warsztat zapisany (dokładność ${g.acc.toFixed(0)} m)`, `Werkstatt gespeichert (Genauigkeit ${g.acc.toFixed(0)} m)`, `Workshop saved (accuracy ${g.acc.toFixed(0)} m)`, `Officina salvata (precisione ${g.acc.toFixed(0)} m)`); render();
    }
    else if (a === 'zapiszProfil') {
      const n = id => { const v = parseFloat(String($('#' + id).value).replace(',', '.')); return isNaN(v) ? 0 : v; };
      try {
        const np = mkProfil({ nazwa: $('#pNazwa').value, godzinyUmowneTydzien: n('pUmowa'), dniRoboczeTydzien: Math.round(n('pDni')) || 5, limitUstawowyTydzien: +$('#pLimit').value,
          stawkaGodzinowa: n('pStawka'), nadgodzinyRoczneLgav: $('#pLgav').checked, doplataUeberstundenProc: n('pUst'), doplataUeberzeitProc: n('pUz'), doplataNocProc: n('pNoc'),
          doplataNiedzielaProc: n('pNd'), doplataSwietoProc: n('pSw'), dniUrlopu: Math.round(n('pUrlop')), trzynastka: $('#p13').checked, kanton: $('#pKanton').value.toUpperCase().slice(0, 2) || 'ZH',
          warsztat: p.warsztat, progDelegacjiKm: n('pProg'), dietaDzienna: n('pDieta'), dojazdDoWarsztatuMin: Math.round(n('pDojazd')), wspolczynnikDrogi: p.wspolczynnikDrogi });
        M.zapiszProfil(np); komunikat = t('Zapisano ✔', 'Gespeichert ✔', 'Saved ✔', 'Salvato ✔');
      } catch (e) { komunikat = '!' + e.message; }
      render();
    }
    else if (a === 'domyslny') { if (confirm(t('Przywrócić domyślne wartości umowy?', 'Standardwerte wiederherstellen?', 'Restore default contract values?', 'Ripristinare i valori predefiniti?'))) { M.zapiszProfil(mkProfil({ warsztat: p.warsztat })); komunikat = t('Przywrócono profil domyślny', 'Standardprofil wiederhergestellt', 'Default profile restored', 'Profilo predefinito ripristinato'); render(); } }
    else if (a === 'eksport') {
      const txt = M.eksport(), nazwa = `godziny-kopia-${D.dzis()}.json`, plik = new File([txt], nazwa, { type: 'application/json' });
      try { if (navigator.canShare && navigator.canShare({ files: [plik] })) { await navigator.share({ files: [plik], title: nazwa }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const u = URL.createObjectURL(plik), l = document.createElement('a'); l.href = u; l.download = nazwa; l.click(); setTimeout(() => URL.revokeObjectURL(u), 5000);
    }
  }

  if (M.sesja()) G.start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (M.sesja()) G.start(); render(); } });
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
