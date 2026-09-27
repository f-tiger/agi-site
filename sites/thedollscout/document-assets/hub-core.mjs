// Fixed tool identifiers only. No search strings, file data or visitor IDs.
export const HUB_TASKS = Object.freeze({
 audit:'pdf-accessibility-checker', batch:'pdf-batch-audit', text:'pdf-to-text',
 compare:'compare-pdf-text', verify:'verify-file', delivery:'delivery-evidence',
});
export const isHubPath = value => /^\/(?:(?:de|zh)\/)?$/.test(value);
export function hubEvent(task) {
 return Object.hasOwn(HUB_TASKS,task) ? 'doc_hub_open_'+task : null;
}
