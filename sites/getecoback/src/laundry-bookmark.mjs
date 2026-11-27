import {HUB, SESSION_COOKIE, TOKEN, accountEntryURL, cookieValue, escape, response} from '../../../tools/fleet-account/config.mjs';

const host = 'https://getecoback.com';
const path = '/auth/wasch-checkliste';
const guide = '/waeschetrockner-oder-luftentfeuchter.html';
const checklist = guide+'#lc-measurement';
const account = accountEntryURL(guide,'de');

function page(content,status=200) {
  return response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Meine Mess-Checkliste | EcoBack</title><link rel="stylesheet" href="/assets/laundry-check.css"></head><body><main class="eb-laundry"><h1>Meine Mess-Checkliste</h1>${content}<p><a href="${checklist}">Zur kostenlosen Mess-Checkliste</a></p></main></body></html>`,
    status,{'Content-Type':'text/html; charset=utf-8'});
}

function signIn() {
  return page(`<p>Merke dir die Anleitung für die nächste Wäsche und finde sie mit deinem kostenlosen Konto auf einem anderen Gerät wieder. Messwerte werden dabei nicht gespeichert.</p><p><a href="${escape(account)}">Kostenloses Konto erstellen oder anmelden</a></p><p>Öffne nach der Rückkehr den Merklink bei der Mess-Checkliste erneut und bestätige das Speichern.</p>`);
}

async function formAction(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || !request.body) return null;
  const reader = request.body.getReader();
  let size = 0, text = '';
  const decoder = new TextDecoder();
  for (;;) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size>40) { await reader.cancel(); return null; }
    text += decoder.decode(value,{stream:true});
  }
  const form = new URLSearchParams(text+decoder.decode());
  const action = form.get('action');
  return form.size===1 && ['add','remove'].includes(action) ? action : null;
}

export async function laundryBookmarkRoute(request, fetcher=fetch) {
  const url = new URL(request.url);
  if (url.pathname !== path) return null;
  if (url.origin !== host) return page('<p>Öffne diese Seite auf getecoback.com.</p>',403);
  if (!['GET','POST'].includes(request.method)) return page('<p>Aktion nicht verfügbar.</p>',405);
  const token = cookieValue(request,SESSION_COOKIE);
  const write = request.method === 'POST';
  if (write && (request.headers.get('Origin') !== host || request.headers.get('Sec-Fetch-Site') === 'cross-site')) {
    return page('<p>Öffne die Merkseite und versuche es erneut.</p>',403);
  }
  if (!TOKEN.test(token)) return signIn();
  const action = write ? await formAction(request) : 'read';
  if (!action) return page('<p>Die Auswahl konnte nicht gelesen werden.</p>',400);
  try {
    const result = await fetcher(HUB+'/api/account-eco-bookmark?action='+action,{
      method:'POST',headers:{Authorization:'Bearer '+token},redirect:'manual',cache:'no-store',
    });
    if (result.status === 401) return signIn();
    if (!result.ok) throw Error('bookmark unavailable');
    const data = await result.json();
    if (data.ok !== true || typeof data.saved !== 'boolean') throw Error('invalid bookmark status');
    if (write) return response(null,303,{Location:path});
    const actionLabel = data.saved ? 'Aus meiner Merkliste entfernen' : 'Mess-Checkliste merken';
    return page(`<p>${data.saved ? 'Die Mess-Checkliste ist in deinem kostenlosen Konto gespeichert.' : 'Speichere den Link zur Mess-Checkliste für deine nächste Wäsche.'} Messwerte bleiben bei dir.</p><form method="post" action="${path}"><button name="action" value="${data.saved ? 'remove' : 'add'}" type="submit">${actionLabel}</button></form>`);
  } catch {
    return page('<p>Die Merkliste ist gerade nicht verfügbar. Bitte versuche es später erneut.</p>',503);
  }
}
