// fe-c-konstanty.js — jediný zdroj čísel pro soustavu Fe–Fe3C.
// Všechny stránky sekce „Vnitřní stavba kovů a tepelné zpracování" čtou hodnoty odsud;
// nikde jinde se tyto konstanty nedefinují.
(function () {
  const FEC = {
    // koncentrace uhlíku [hm. %]
    C_P: 0.018,     // bod P — max. rozpustnost C ve feritu
    C_S: 0.765,     // bod S — eutektoidní koncentrace
    C_E: 2.14,      // bod E — max. rozpustnost C v austenitu
    C_C: 4.3,       // bod C — eutektická koncentrace
    C_CEM: 6.68,    // bod D/F/K — obsah C v cementitu
    EUT_TOL: 0.02,  // tolerance pásma eutektoidní oceli kolem bodu S

    // teploty [°C]
    T_A: 1538,      // bod A — teplota tání čistého Fe
    T_G: 911,       // bod G — přeměna γ↔α čistého Fe
    T_EUT: 1147,    // přímka ECF — eutektická teplota
    T_A1: 727,      // přímka PSK — eutektoidní teplota (A1)
    T_D: 1380,      // bod D — teplota tání cementitu

    // cementovaná vrstva — společné parametry pro stránky Cementace a Porovnání
    CEM: { HV_SURFACE: 690, HRC_SURFACE: 60, HV_CORE: 165, C_CORE: 0.17 },
  };
  // číslo v českém zápisu (desetinná čárka)
  FEC.cz = function (v, dec) { return (dec == null ? String(v) : v.toFixed(dec)).replace('.', ','); };
  window.FEC = FEC;
})();
