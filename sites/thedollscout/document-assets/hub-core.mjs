// Fixed tool identifiers only. No search strings, file data or visitor IDs.
export const HUB_TASKS = Object.freeze({
 portrait:'ai-portrait-background-remover', speech:'ai-audio-to-text', summary:'ai-text-summarizer',
 image:'image-compressor', json:'json-compare', meeting:'time-zone-planner',
 verify:'verify-file', delivery:'delivery-evidence', audit:'pdf-accessibility-checker',
 batch:'pdf-batch-audit', text:'pdf-to-text', compare:'compare-pdf-text',
});
export const isHubPath = value => /^\/(?:(?:de|zh)\/)?(?:document-tools)?$/.test(value);
export function hubEvent(task) {
 return Object.hasOwn(HUB_TASKS,task) ? 'doc_hub_open_'+task : null;
}

export const isToolPath = value => typeof value==='string' && Object.values(HUB_TASKS).includes(value.replace(/^\/(?:(?:de|zh)\/)?/,'')) && /^\//.test(value);
