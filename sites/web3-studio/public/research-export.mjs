// The same local text is used for both the download and the manual-copy fallback.
// Keep the URL usable until the user changes the note or leaves the page.
export function prepareNoteDownload(text, link, preview, urlApi=URL) {
  preview.value=text;
  link.hidden=true;
  const url=urlApi.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  link.href=url;
  link.download='web3-evidence-note.md';
  link.hidden=false;
  return ()=>{urlApi.revokeObjectURL(url);link.removeAttribute('href');link.hidden=true;};
}
