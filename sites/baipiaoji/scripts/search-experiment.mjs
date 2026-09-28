import { readFileSync } from 'node:fs';

export const searchExperiment = JSON.parse(readFileSync(new URL('../data/search-experiment.json', import.meta.url), 'utf8'));
export function experimentDescription(slug, locale, fallback) {
  if (locale !== 'en' || searchExperiment.status !== 'running') return fallback;
  return searchExperiment.pages.find(p => p.cohort === 'treatment' && p.path === '/en/tools/' + slug)?.description || fallback;
}

// An existing-page navigation improvement. No quota claim, new page or registration wall.
export function limitCheckEntry(locale, base) {
  if (locale !== 'en') return '';
  return `<section id="limit-check" data-home-block="limit-check">
    <div class="bpj-section-head"><div><p class="bpj-eyebrow">BEFORE YOU SIGN UP</p>
    <h2>What does “free” actually include?</h2>
    <p>Check the allowance, what happens when it runs out, and whether the output fits your use. Each tool record keeps its sources and content-check dates.</p></div></div>
    <div class="bpj-task-lanes">
      <article class="bpj-task-lane"><h3>Build with an AI API</h3><p>Separate one-off trial credit from a recurring free allowance. Check the billing conditions before connecting an app.</p><a href="${base}/c/api">Compare AI API limits →</a></article>
      <article class="bpj-task-lane"><h3>Make an AI video</h3><p>Check credit resets and watermarks before starting a render. Free generation and permission to publish are separate questions.</p><a href="${base}/c/video">Compare video tool limits →</a></article>
      <article class="bpj-task-lane"><h3>Use the output for work</h3><p>Review the recorded commercial-use conditions and follow the official source. Unknown terms remain unknown.</p><a href="${base}/publish-check">Check commercial-use conditions →</a></article>
    </div>
  </section>`;
}
