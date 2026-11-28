"""Room-specific constraints used by both area generators and the final edition pass."""
from html import escape


def room_advice(area, heating):
    if area <= 12:
        title = 'Innenbad, Gäste-WC oder Abstellkammer'
        advice = ('Kurze Aufheizzeit und Platz für die vorgeschriebenen Abstände prüfen.' if heating else
                  'Nach dem Duschen erst die Abluft prüfen. Ein kompakter Entfeuchter braucht freie Ansaug- und Ausblaswege.')
        detail = 'In Spritzwasserzonen mindestens IPX4 beachten. Schutzart allein erlaubt keine Aufstellung: Schutzbereich, Herstellerfreigabe und Anschluss mit einer Elektrofachkraft klären.'
    elif area <= 20:
        title = 'Schlafzimmer, Homeoffice oder Kinderzimmer'
        advice = ('Am Schreibtisch braucht eine 100-W-Wärmedecke in vier Stunden 0,4 kWh, ein 2-kW-Heizlüfter bei durchgehend voller Leistung 8 kWh. Nur der Heizlüfter erwärmt den Raum.' if heating else
                  'Für die Nacht einen leisen Modus unter 38–40 dB(A) als persönlichen Zielwert setzen und auf abschaltbare Anzeigen achten. Schalldruck nur bei gleicher Messdistanz vergleichen.')
        detail = 'Am Bett und am Schreibtisch zuerst die tatsächlichen Betriebszeiten festlegen. Geräte und Kabel außerhalb der Reichweite kleiner Kinder aufstellen.'
    elif area <= 35:
        title = 'Wohnzimmer, offene Wohnküche oder Waschkeller'
        advice = ('Offene Türen vergrößern die beheizte Zone. Am Sofa kann lokale Wärme reichen; beim Heizen der ganzen Wohnküche auch den offenen Nebenraum mitrechnen.' if heating else
                  'Bei mehreren Wäscheladungen einen Tank ab etwa 4 Litern oder einen Schlauchanschluss mit sicherem Gefälle einplanen. Ein Wäschemodus ersetzt keinen Ablauf.')
        detail = 'Beim Wäschetrocknen Feuchte vor und nach dem Lüften messen. Heizen allein transportiert die Feuchtigkeit nicht nach draußen.'
    else:
        title = 'Großer Keller oder hoher Altbau'
        volume = f'{area * 2.8:g}'.replace('.', ',')
        advice = f'{area} m² bei 2,80 m Deckenhöhe ergeben {volume} m³. Bei höheren Decken das tatsächliche Volumen einsetzen.'
        detail = '230 V × 16 A ergeben rechnerisch 3.680 W für den ganzen Stromkreis. Weitere Verbraucher mitrechnen. Das ist keine Freigabe für Dauerlast an einer einzelnen Steckdose oder Mehrfachleiste.'
    return f'<section class="cro-room" id="raumprofil"><h2>{escape(title)}</h2><p>{escape(advice)}</p><p>{escape(detail)}</p></section>'
