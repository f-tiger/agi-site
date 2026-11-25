export function checkCoolingOffer({
  tage_bis_bedarf, lieferdauer_tage, einrichten_tage, preis_eur, deckel_eur, frist_belegt,
}) {
  const reserve = tage_bis_bedarf - lieferdauer_tage - einrichten_tage;
  return {
    budget_eingehalten: preis_eur <= deckel_eur,
    reserve_tage: frist_belegt ? reserve : null,
    zeitlich: !frist_belegt ? 'lieferfrist_pruefen' : reserve >= 0 ? 'ins_zeitfenster_geplant' : 'zu_spaet_geplant',
    grenze: 'Eigene Planung ohne Preis- oder Lieferprognose. Bestätigung kann sich bis zum Kauf ändern.',
  };
}
