// Both German search surfaces pass normalized lowercase query text with ae/oe/ue.
export function asksForCellarVentilationCheck(query) {
  if (!/\bkeller(?:s|raum|raeume[n]?|luft|wand|waende|fenster|lueftung)?\b/.test(query)) return false;
  // Duration, diagnosis, air quality and appliance selection need their own answers.
  if (/\b(?:wie\s+(?:oft|lange?)|dauer|zeitplan[a-z]*|zeitabschnitt[a-z]*|messintervall[a-z]*|heizkost[a-z]*|stromkost[a-z]*|co[₂2]|radon[a-z]*|abgas[a-z]*|geruch[a-z]*|luftqualitaet|frischluftversorgung|schimmel[a-z]*|wassereintritt|gutachter|luftentfeuchter|entfeuchter|kellerentfeuchter)\b/.test(query)) return false;
  const air = /\b(?:lueft(?:en|e|et|ung)|auslueften|durchlueften|(?:keller)?fenster\s+(?:auf(?:machen)?|oeffnen))\b/.test(query);
  if (!air) return false;
  const decision = /\b(?:soll(?:en|te[n]?)?|darf|duerfen|kann|koennen|jetzt|lohnt|sinnvoll|trockener|feuchter|trockn[a-z]*|(?:keller)?fenster\s+(?:auf(?:machen)?|oeffnen))\b/.test(query);
  const outdoorReading = /\b(?:draussen|aussen(?:luft|feuchte|temperatur)?|im\s+freien)\b/.test(query) &&
    /\d\s*(?:%|°|grad\b|prozent\b)/.test(query);
  return decision || outdoorReading;
}
