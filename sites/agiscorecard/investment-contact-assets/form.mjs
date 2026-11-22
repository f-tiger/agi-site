const form = document.getElementById('contact-form');
const project = document.getElementById('contact-project');
const interest = document.getElementById('contact-type');
const name = document.getElementById('contact-name');
const proposal = document.getElementById('contact-proposal');
const website = document.getElementById('contact-website');
const timing = document.getElementById('contact-timing');
const preview = document.getElementById('contact-preview');
const template = document.getElementById('contact-template');
const status = document.getElementById('contact-status');
const localeLinks = document.querySelectorAll('[data-contact-locale]');
const projects = new Set(['AGI', 'BPJ', 'ECO', 'TDS']);
const interests = new Set(['INVESTMENT', 'PARTNERSHIP']);

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

function showStatus(message) {
  status.textContent = message;
  status.hidden = false;
}

function validWebsite() {
  if (!website.value.trim()) return true;
  try {
    const url = new URL(website.value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function compose(includeEmptyFields) {
  if (!projects.has(project.value) || !interests.has(interest.value)) return null;
  if (!validWebsite()) {
    website.setCustomValidity(form.dataset.invalidUrl);
    website.reportValidity();
    return null;
  }
  if (!includeEmptyFields) {
    for (const field of [name, proposal]) {
      if (!field.value.trim()) {
        field.setCustomValidity(form.dataset.invalidText);
        field.reportValidity();
        return null;
      }
    }
  }

  const fields = [
    [project, project.selectedOptions[0].textContent],
    [interest, interest.selectedOptions[0].textContent],
    [name, name.value.trim()],
    [proposal, proposal.value.trim()],
    [website, website.value.trim()],
    [timing, timing.value.trim()],
  ];
  const parts = fields
    .filter(([, value]) => value || includeEmptyFields)
    .map(([field, value]) => field.labels[0].textContent + '\r\n' + (value || '…'));
  const subject = 'AGIFLEETINVESTV1 [' + project.value + '] [' + interest.value + ']';
  const body = [form.dataset.greeting, ...parts, form.dataset.thanks]
    .join('\r\n\r\n')
    .replace(/\r?\n/g, '\r\n');
  return {subject, body};
}

project.addEventListener('change', switchLinks);
switchLinks();
for (const field of [name, proposal, website]) {
  field.addEventListener('input', () => field.setCustomValidity(''));
}

document.getElementById('contact-copy').addEventListener('click', async () => {
  const message = compose(true);
  if (!message) return;
  template.value = [form.dataset.subjectLabel, message.subject, '', message.body].join('\r\n');
  preview.hidden = false;
  try {
    await navigator.clipboard.writeText(template.value);
    showStatus(form.dataset.copied);
  } catch {
    showStatus(form.dataset.manual);
    template.focus();
    template.select();
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const recipient = form.dataset.recipient;
  if (!recipient) return;
  const message = compose(false);
  if (!message) return;
  const to = encodeURIComponent(recipient).replace('%40', '@');
  showStatus(form.dataset.draftOpened);
  location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(message.subject) +
    '&body=' + encodeURIComponent(message.body);
});

form.querySelector('fieldset').disabled = false;
