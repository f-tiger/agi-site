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

function searchRow({path,title,alternate,aliases=[],description},groupTitle,groupId) {
  const url=new URL(path,location.origin);
  return {
    url,title,description,groupTitle,groupId,
    searchable:{
      titles:[title,alternate,...aliases].map(normalize),
      alias:normalize(url.pathname.split('/').pop()),
      description:normalize(description+' '+groupTitle),
    },
  };
}

function resultItem({url,title,description,groupTitle}) {
  const row=document.createElement('li');
  row.setAttribute('data-suite-keywords','');
  const tag=document.createElement('span');
  tag.className='suite-search-category';
  tag.textContent=groupTitle;
  const link=document.createElement('a');
  link.href=url.href;
  link.textContent=title;
  const detail=document.createElement('p');
  detail.className='suite-directory-description';
  detail.textContent=description;
  row.append(tag,link,detail);
  return row;
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
  const unavailable=index.querySelector('[data-suite-unavailable]');
  const browse=index.querySelector('[data-suite-browse]');
  const results=index.querySelector('[data-suite-results]');
  const list=results.querySelector('[data-suite-result-list]');
  const more=results.querySelector('[data-suite-more]');

  // The homepage loads its search data only after a query; tool hubs index their HTML links.
  let rowsPromise;
  function indexRows() {
    const source=index.dataset.suiteSource;
    if(source){
      return fetch(source).then(response=>{
        if(!response.ok) throw Error('AI suite search index unavailable');
        return response.json();
      }).then(groups=>groups.flatMap(group=>group.tools.map(tool=>searchRow(tool,group.title,group.id))));
    }
    return [...index.querySelectorAll('[data-suite-group]')].flatMap(group=>{
      const groupTitle=group.querySelector('strong').textContent;
      return [...group.querySelectorAll('[data-suite-keywords]')].map(row=>{
        const link=row.querySelector('a');
        return searchRow({
          path:link.href,
          title:link.textContent,
          alternate:row.dataset.suiteAlt,
          aliases:JSON.parse(row.dataset.suiteAliases || '[]'),
          description:row.querySelector('.suite-directory-description').textContent,
        },groupTitle,group.dataset.groupId);
      });
    });
  }

  const total=Number(index.dataset.suiteTotal);
  let matches=[];
  let generation=0;

  function showMore({focus=false}={}) {
    const fragment=document.createDocumentFragment();
    const start=list.childElementCount;
    const page=matches.slice(start,start+PAGE_SIZE);
    for(const row of page) fragment.append(resultItem(row));
    list.append(fragment);
    more.hidden=list.childElementCount>=matches.length;
    const n=format.format(matches.length);
    const shown=format.format(list.childElementCount);
    counter.textContent=t(`${n} 项结果，已显示 ${shown} 项`,`Showing ${shown} of ${n} matches`);
    if(focus) list.children[start]?.querySelector('a').focus();
  }

  async function refresh() {
    const request=++generation;
    list.replaceChildren();
    const typed=search.value.trim();
    const query=normalize(typed).replace(/^bpj (?=\S)/,'');
    const groupId=select?.value || '';
    const active=Boolean(typed || groupId);
    browse.hidden=active;
    reset.hidden=!active;
    results.hidden=true;
    empty.hidden=true;
    if(unavailable) unavailable.hidden=true;
    matches=[];
    if(!active) {
      counter.textContent=t(`共 ${format.format(total)} 个工具`,`${format.format(total)} BPJ tools`);
      return;
    }

    let rows;
    try {
      if(!rowsPromise){
        if(index.dataset.suiteSource) counter.textContent=t('正在载入工具搜索…','Loading tools…');
        rowsPromise=Promise.resolve(indexRows()).catch(error=>{
          rowsPromise=null;
          throw error;
        });
      }
      rows=await rowsPromise;
    } catch {
      if(request!==generation) return;
      counter.textContent='';
      browse.hidden=false;
      if(unavailable) unavailable.hidden=false;
      return;
    }
    if(request!==generation) return;
    const scoped=groupId?rows.filter(row=>row.groupId===groupId):rows;
    if(typed && !query) {
      matches=[];
    } else if(query) {
      const words=query.split(' ');
      matches=scoped.map(row=>({row,score:relevance(row.searchable,query,words)}))
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
    list.querySelector('a')?.focus();
  });
  refresh();
  controls.hidden=false;
}

for(const index of document.querySelectorAll('[data-suite-index]')) initDirectory(index);
