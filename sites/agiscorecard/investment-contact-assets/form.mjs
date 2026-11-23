const form = document.getElementById('contact-form');
const fields = form.querySelector('fieldset');
const project = document.getElementById('contact-project');
const interest = document.getElementById('contact-type');
const name = document.getElementById('contact-name');
const replyEmail = document.getElementById('contact-reply-email');
const proposal = document.getElementById('contact-proposal');
const website = document.getElementById('contact-website');
const timing = document.getElementById('contact-timing');
const websiteCheck = document.getElementById('contact-website-check');
const preview = document.getElementById('contact-preview');
const template = document.getElementById('contact-template');
const status = document.getElementById('contact-status');
const availability = document.getElementById('contact-availability');
const submit = document.getElementById('contact-send');
const check = document.getElementById('contact-check');
const localeLinks = document.querySelectorAll('[data-contact-locale]');
const projects = new Set(['AGI', 'BPJ', 'ECO', 'TDS']);
const interests = new Set(['INVESTMENT', 'PARTNERSHIP']);
const api = '/api/investment-contact';

let ready = false;
let sending = false;
let checking = false;
let previousAttempt;

const codes = new URLSearchParams(location.search).getAll('site');
const incomingProject = codes.length === 1 ? codes[0].toUpperCase() : '';
if (projects.has(incomingProject)) project.value = incomingProject;

function switchLinks() {
  for (const link of localeLinks) {
    const url = new URL(link.href);
    url.searchParams.set('site', project.value);
    link.href = url.href;
  }
}

function setMessage(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function values() {
  return {
    project: project.value,
    type: interest.value,
    name: name.value.trim(),
    replyEmail: replyEmail.value.trim(),
    proposal: proposal.value.trim(),
    website: website.value.trim(),
    timing: timing.value.trim(),
  };
}

function submissionKey(input = values()) {
  return JSON.stringify([input, websiteCheck.value]);
}

function updateSubmit() {
  const alreadyAccepted = previousAttempt?.accepted && previousAttempt.key === submissionKey();
  submit.disabled = !ready || sending || alreadyAccepted;
}

function setReadiness(value, message) {
  ready = value;
  check.hidden = value;
  setMessage(availability, message);
  updateSubmit();
}

async function callApi(method, input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), method === 'GET' ? 7000 : 15000);
  const headers = {Accept: 'application/json'};
  const options = {
    method,
    headers,
    signal: controller.signal,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
  };
  if (input) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(input);
  }
  try {
    const response = await fetch(api, options);
    const data = await response.json().catch(() => null);
    return {status: response.status, data};
  } finally {
    clearTimeout(timeout);
  }
}

async function checkReadiness() {
  if (checking || sending) return;
  checking = true;
  check.disabled = true;
  setReadiness(false, form.dataset.checking);
  try {
    const {status: code, data} = await callApi('GET');
    if (code !== 200 || typeof data?.ready !== 'boolean') {
      setReadiness(false, form.dataset.checkFailed);
    } else {
      setReadiness(data.ready, data.ready ? '' : form.dataset.unavailable);
      if (data.ready && status.textContent === form.dataset.unavailable) setMessage(status, '');
    }
  } catch {
    setReadiness(false, form.dataset.checkFailed);
  } finally {
    checking = false;
    check.disabled = false;
  }
}

function reportInvalid(field, message) {
  field.setCustomValidity(message);
  field.reportValidity();
  return false;
}

function validateWebsite(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return true;
  } catch {
    // The same inline error covers invalid URLs and unsupported protocols.
  }
  return reportInvalid(website, form.dataset.invalidUrl);
}

function validate(input) {
  if (!projects.has(input.project) || !interests.has(input.type)) {
    setMessage(status, form.dataset.invalidSubmission);
    return false;
  }
  if (!input.name) return reportInvalid(name, form.dataset.invalidText);
  if (!input.proposal) return reportInvalid(proposal, form.dataset.invalidText);
  return validateWebsite(input.website) && form.reportValidity();
}

function edited(event) {
  event.target.setCustomValidity?.('');
  preview.hidden = true;
  if (previousAttempt?.key !== submissionKey()) {
    setMessage(status, '');
  } else if (previousAttempt?.accepted) {
    setMessage(status, form.dataset.accepted);
  }
  updateSubmit();
}

project.addEventListener('change', switchLinks);
form.addEventListener('input', edited);
form.addEventListener('change', edited);
check.addEventListener('click', checkReadiness);

document.getElementById('contact-copy').addEventListener('click', async () => {
  const input = values();
  if (!projects.has(input.project) || !interests.has(input.type) || !validateWebsite(input.website)) return;
  const parts = [
    [project, project.selectedOptions[0].textContent],
    [interest, interest.selectedOptions[0].textContent],
    [name, input.name],
    [replyEmail, input.replyEmail],
    [proposal, input.proposal],
    [website, input.website],
    [timing, input.timing],
  ].map(([field, value]) => field.labels[0].textContent + '\r\n' + (value || '…'));
  const subject = 'AGIFLEETINVESTV1 [' + input.project + '] [' + input.type + ']';
  const body = [form.dataset.greeting, ...parts, form.dataset.thanks].join('\r\n\r\n').replace(/\r?\n/g, '\r\n');
  template.value = [form.dataset.subjectLabel, subject, '', body].join('\r\n');
  preview.hidden = false;
  try {
    await navigator.clipboard.writeText(template.value);
    setMessage(status, form.dataset.copied);
  } catch {
    setMessage(status, form.dataset.manual);
    template.focus();
    template.select();
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const input = values();
  if (!validate(input)) return;

  const key = submissionKey(input);
  sending = true;
  fields.disabled = true;
  updateSubmit();
  setMessage(status, form.dataset.sending);
  try {
    if (previousAttempt?.key !== key) previousAttempt = {key, requestId: crypto.randomUUID()};
    const payload = {...input, requestId: previousAttempt.requestId, websiteCheck: websiteCheck.value};
    const {status: code, data} = await callApi('POST', payload);
    if (code === 202 && data?.ok === true) {
      previousAttempt.accepted = true;
      setMessage(status, form.dataset.accepted);
    } else if (code === 400) {
      setMessage(status, form.dataset.invalidSubmission);
    } else if (code === 429) {
      setMessage(status, form.dataset.rateLimited);
    } else if (code === 503) {
      setReadiness(false, form.dataset.unavailable);
      setMessage(status, '');
    } else {
      setMessage(status, form.dataset.unconfirmed);
    }
  } catch {
    setMessage(status, form.dataset.unconfirmed);
  } finally {
    sending = false;
    fields.disabled = false;
    updateSubmit();
  }
});

switchLinks();
fields.disabled = false;
form.hidden = false;
checkReadiness();
