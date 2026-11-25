import {matchesInputSchema} from './input-schema.mjs';

export const UK_LAUNDRY_WORKSPACE_PRODUCT = 'tds-uk-laundry-review';

export function readLaundryWorkspace(data, schema) {
  if (data?.version !== 1 || data.product !== UK_LAUNDRY_WORKSPACE_PRODUCT ||
      !data.values || typeof data.values !== 'object' || Array.isArray(data.values)) return null;
  const {reviewedAt, ...inputs} = data.values;
  if (typeof reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) return null;
  const date = new Date(reviewedAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== reviewedAt) return null;
  if (!matchesInputSchema(inputs, schema) || !inputs.comparableSessions) return null;
  return {inputs, reviewedAt};
}

function workspaceContext(value) {
  if (!value || typeof value.id !== 'string' || !/^[a-f0-9]{32}$/.test(value.id) ||
      !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.name !== 'string') return null;
  return {id: value.id, revision: value.revision, name: value.name.slice(0, 80)};
}

export function mountLaundryWorkspace({panel, locale, copy, schema, record, restore}) {
  const button = panel.querySelector('[data-tds-review-open]');
  const status = panel.querySelector('[data-tds-review-status]');
  const terms = panel.querySelector('[data-tds-review-terms]');
  const origin = location.origin;
  const parameters = new URLSearchParams(location.search);
  let eligible = null;
  let context = null;
  let opening = null;
  let readiness = null;
  let checkoutReady = false;
  let offerMeasured = false;
  let restoreEpoch = 0;

  function render() {
    panel.hidden = !eligible;
    terms.hidden = !checkoutReady;
    button.textContent = checkoutReady && !context ? copy.start : copy.existing;
  }

  function measureOffer() {
    if (!offerMeasured && eligible && checkoutReady && !context) {
      offerMeasured = true;
      record('tds_paid_offer_view');
    }
  }

  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) measureOffer();
  }, {threshold: 0.1}) : null;
  observer?.observe(panel);

  function checkAvailability() {
    if (readiness) return;
    status.textContent = copy.checking;
    readiness = fetch('/api/member', {credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(6000)})
      .then(response => response.ok ? response.json() : null)
      .then(result => result?.ok === true && result.site === 'tds'
        ? (result.ready === true ? 'ready' : 'paused')
        : 'unavailable')
      .catch(() => 'unavailable')
      .then(state => {
        checkoutReady = state === 'ready';
        status.textContent = checkoutReady ? '' : copy[state];
        render();
        if (checkoutReady && panel.getBoundingClientRect().top < innerHeight && panel.getBoundingClientRect().bottom > 0) measureOffer();
      });
  }

  button.addEventListener('click', event => {
    if (!event.isTrusted || !eligible) return;
    if (opening && !opening.tab.closed) {
      opening.tab.focus();
      status.textContent = copy.alreadyOpen;
      return;
    }
    opening?.stop();
    const url = new URL(locale === 'de' ? '/de/members' : '/members', origin);
    url.searchParams.set('tool', UK_LAUNDRY_WORKSPACE_PRODUCT);
    url.searchParams.set('from', origin);
    if (parameters.has('__ci')) url.searchParams.set('__ci', '1');
    const tab = window.open(url.href, '_blank');
    if (!tab) {
      status.textContent = copy.popup;
      return;
    }
    const draft = eligible;
    const target = context;
    const revisionAtOpen = restoreEpoch;
    const handoff = crypto.randomUUID().replaceAll('-', '');
    let sent = false;
    function stop() {
      window.removeEventListener('message', receive);
      clearTimeout(timeout);
      opening = null;
    }
    function receive(event) {
      if (event.source !== tab || event.origin !== origin) return;
      if (!sent && event.data?.kind === 'workbench-member-ready') {
        sent = true;
        tab.postMessage({kind: 'workbench-save', data: draft, context: target, handoff}, origin);
        status.textContent = copy.sent;
      }
      if (!sent || event.data?.kind !== 'workbench-saved' || event.data.product !== UK_LAUNDRY_WORKSPACE_PRODUCT ||
          event.data.handoff !== handoff) return;
      const saved = workspaceContext(event.data.context);
      if (!saved) return;
      stop();
      if (event.data.same === true) record('tds_paid_workspace_saved');
      if (restoreEpoch === revisionAtOpen) {
        context = saved;
        status.textContent = eligible === draft && event.data.same === true ? copy.saved : copy.changed;
        render();
      }
    }
    const timeout = setTimeout(stop, 75 * 60 * 1000);
    opening = {tab, stop};
    window.addEventListener('message', receive);
    status.textContent = copy.opened;
    if (checkoutReady && !context) {
      measureOffer();
      record('tds_paid_member_open');
    }
  });

  if (window.opener && parameters.get('restore') === '1') {
    const opener = window.opener;
    function receiveRestore(event) {
      if (event.source !== opener || event.origin !== origin || event.data?.kind !== 'workbench-restore') return;
      const restored = readLaundryWorkspace(event.data.data, schema);
      const saved = workspaceContext(event.data.context);
      if (!restored || !saved || !restore({...restored.inputs, comparableSessions: false}, restored.reviewedAt)) return;
      restoreEpoch++;
      context = saved;
      window.removeEventListener('message', receiveRestore);
      record('tds_paid_workspace_restored');
    }
    window.addEventListener('message', receiveRestore);
    opener.postMessage({kind: 'workbench-ready'}, origin);
  }

  return {
    clear() {
      eligible = null;
      render();
    },
    offer(inputs) {
      eligible = {
        version: 1,
        product: UK_LAUNDRY_WORKSPACE_PRODUCT,
        values: {...inputs, reviewedAt: new Date().toISOString().slice(0, 10)},
      };
      render();
      if (checkoutReady && panel.getBoundingClientRect().top < innerHeight && panel.getBoundingClientRect().bottom > 0) measureOffer();
      checkAvailability();
    },
  };
}
