const PAGE_SIZE=16;

function normalize(text) {
  return text.normalize('NFKC').toLowerCase()
    .replace(/([\p{Script=Latin}\p{N}])(?=\p{Script=Han})/gu,'$1 ')
    .replace(/(\p{Script=Han})(?=[\p{Script=Latin}\p{N}])/gu,'$1 ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();
}

function relevance({titles,alias,description},query,words) {
  if(titles.includes(query) || alias===query) return 6;
  if(titles.some(title=>title.startsWith(query))) return 5;
  if(titles.some(title=>title.includes(query))) return 4;
  if(titles.some(title=>words.every(word=>title.includes(word)))) return 3;
  if(words.every(word=>alias.includes(word))) return 2;
  const text=[...titles,alias,description].join(' ');
  return words.every(word=>text.includes(word))?1:0;
}

function initDirectory(index) {
  const lang=document.documentElement.lang;
  const zh=lang.startsWith('zh');
  const t=(cn,en)=>zh?cn:en;
  const format=new Intl.NumberFormat(lang);
  const controls=index.querySelector('[data-suite-controls]');
  const search=index.querySelector('[data-suite-search]');
  const select=index.querySelector('[data-suite-filter]');
  const counter=index.querySelector('[data-suite-count]');
  const reset=index.querySelector('[data-suite-clear]');
  const empty=index.querySelector('[data-suite-empty]');
  const browse=index.querySelector('[data-suite-browse]');
  const results=index.querySelector('[data-suite-results]');
  const list=results.querySelector('[data-suite-result-list]');
  const more=results.querySelector('[data-suite-more]');

  // Index the static links on first use. Movable results reuse their original link nodes.
  let rows;
  function indexRows() {
    return [...index.querySelectorAll('[data-suite-group]')].flatMap(group=>{
      const groupTitle=group.querySelector('strong').textContent;
      return [...group.querySelectorAll('[data-suite-keywords]')].map(row=>{
        const link=row.querySelector('a');
        return {
          row, link, groupTitle, groupId:group.dataset.groupId,
          titles:[normalize(link.textContent),normalize(row.dataset.suiteAlt)],
          alias:normalize(link.pathname.split('/').pop()),
          description:normalize(row.querySelector('.suite-directory-description').textContent+' '+groupTitle),
        };
      });
    });
  }

  const total=browse.querySelectorAll('[data-suite-keywords]').length;
  let matches=[];
  let moved=[];

  function restoreRows() {
    for (const {row,parent,next,tag} of moved.reverse()) {
      tag.remove();
      parent.insertBefore(row,next);
    }
    moved=[];
  }

  function showMore({focus=false}={}) {
    const fragment=document.createDocumentFragment();
    const start=moved.length;
    const page=matches.slice(start,start+PAGE_SIZE);
    for(const {row,groupTitle} of page) {
      const tag=document.createElement('span');
      tag.className='suite-search-category';
      tag.textContent=groupTitle;
      row.prepend(tag);
      moved.push({row,parent:row.parentNode,next:row.nextSibling,tag});
      fragment.append(row);
    }
    list.append(fragment);
    more.hidden=moved.length>=matches.length;
    const n=format.format(matches.length);
    const shown=format.format(moved.length);
    counter.textContent=t(`${n} 项结果，已显示 ${shown} 项`,`Showing ${shown} of ${n} matches`);
    if(focus) page[0]?.link.focus();
  }

  function refresh() {
    restoreRows();
    const typed=search.value.trim();
    const query=normalize(typed).replace(/^bpj (?=\S)/,'');
    const groupId=select?.value || '';
    const active=Boolean(typed || groupId);
    browse.hidden=active;
    reset.hidden=!active;
    if(!active) {
      matches=[];
      results.hidden=true;
      empty.hidden=true;
      counter.textContent=t(`共 ${format.format(total)} 个工具`,`${format.format(total)} BPJ tools`);
      return;
    }

    rows??=indexRows();
    const scoped=groupId?rows.filter(row=>row.groupId===groupId):rows;
    if(typed && !query) {
      matches=[];
    } else if(query) {
      const words=query.split(' ');
      matches=scoped.map(row=>({row,score:relevance(row,query,words)}))
        .filter(item=>item.score>0).sort((a,b)=>b.score-a.score).map(item=>item.row);
    } else {
      matches=scoped;
    }
    empty.hidden=matches.length>0;
    results.hidden=matches.length===0;
    if(matches.length) showMore();
    else counter.textContent=t('0 项结果','0 matches');
  }

  search.addEventListener('input',refresh);
  select?.addEventListener('change',refresh);
  reset.addEventListener('click',()=>{
    search.value='';
    if(select) select.value='';
    refresh();
    search.focus();
  });
  more.addEventListener('click',()=>showMore({focus:true}));
  search.form.addEventListener('submit',event=>{
    event.preventDefault();
    matches[0]?.link.focus();
  });
  refresh();
  controls.hidden=false;
}

for(const index of document.querySelectorAll('[data-suite-index]')) initDirectory(index);
