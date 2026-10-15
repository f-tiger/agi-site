// The worksheet stays blank: no local collection, personal input or partner data is read.
export function initSwapKit(root,record,{clipboard=globalThis.navigator?.clipboard,print=()=>globalThis.print()}={}){
 if(!root)return;
 const labels=JSON.parse(root.querySelector('[data-swap-labels]').textContent);
 const status=root.querySelector('[data-swap-status]');
 const printButton=root.querySelector('[data-swap-print]'),share=root.querySelector('[data-swap-share]');
 printButton.hidden=false;share.hidden=false;
 printButton.addEventListener('click',()=>{status.textContent=labels.printing;record('collector_swap_print_request');print();});
 share.addEventListener('click',async()=>{try{await clipboard.writeText(labels.url);status.textContent=labels.copied;record('collector_swap_link_copy');}catch{status.textContent=labels.failed;}});
}
