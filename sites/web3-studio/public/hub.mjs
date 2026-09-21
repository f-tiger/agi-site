const search=document.getElementById('tool-search'),category=document.getElementById('tool-category');
const rows=[...document.querySelectorAll('[data-tool]')];
function filter(){const q=search.value.trim().toLocaleLowerCase(),cat=category.value;let count=0;for(const row of rows){const matches=(!q||row.textContent.toLocaleLowerCase().includes(q))&&(cat==='all'||row.dataset.category===cat);row.hidden=!matches;if(matches)count++;}document.getElementById('finder-status').textContent=count+' matching tools';document.getElementById('finder-empty').hidden=count!==0;}
search.addEventListener('input',filter);category.addEventListener('change',filter);
