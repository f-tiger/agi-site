import {validate,pages,THEMES,wrapLines} from './deck-core.mjs';
export async function exportPPTX(project,PptxGenJS){
 const p=validate(project).values,t=THEMES[p.theme],pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author=p.author||'BPJ ProposalDeck';pptx.subject=p.client;pptx.title=p.title;pptx.company=p.author;pptx.lang=p.language==='zh'?'zh-CN':'en-US';
 pptx.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:pptx.lang};
 const list=pages(project);
 for(const [n,s]of list.entries()){
  const slide=pptx.addSlide();slide.background={color:t.paper};
  const add=(text,x,y,w,h,size,color=t.ink,other={})=>slide.addText(text,{x,y,w,h,fontFace:p.language==='zh'?'Microsoft YaHei':'Arial',fontSize:size,color,margin:0,breakLine:false,valign:'top',...other});
  const cover=s.type==='cover';
  add(cover?p.client:p.title,.65,.35,11.9,.38,12,t.muted);
  add(wrapLines(s.title,cover?42:52).join('\n'),.65,cover?1.2:1.03,11.9,cover?1.85:1.35,cover?40:30,t.ink,{bold:true});
  if(s.type==='table'){
   slide.addTable([s.columns,...s.rows],{x:.65,y:2.45,w:12.0,h:s.headerHeight+s.heights.reduce((a,b)=>a+b,0),rowH:[s.headerHeight,...s.heights],colW:s.columns.map(()=>12/s.columns.length),fontFace:p.language==='zh'?'Microsoft YaHei':'Arial',fontSize:17,color:t.ink,margin:7,border:{type:'solid',pt:.5,color:'CBD3DE'},autoPage:false,fill:t.paper,bold:false});
  }else if(s.type==='chart'){
   slide.addChart(pptx.ChartType.bar,[{name:s.unit,labels:s.data.map(d=>d.label),values:s.data.map(d=>d.value)}],{x:.7,y:2.38,w:11.5,h:3.55,barDir:'bar',catAxisLabelFontFace:'Microsoft YaHei',catAxisLabelFontSize:17,valAxisLabelFontSize:13,showTitle:false,showLegend:false,showValue:true,dataLabelFormatCode:'0.##',chartColors:[t.accent],showCatName:false,showBorder:false,valAxisTitle:s.unit,showValue:true,showValAxisTitle:!!s.unit,showMarker:false});
  }else add(s.body,.7,cover?3.35:2.55,11.85,cover?2.75:3.55,20,t.ink,{breakLine:false,paraSpaceAfterPt:10});
  add(s.source||'',.7,6.35,11.6,.57,10,t.muted);
  add(p.author,.7,7.0,9,.25,10,t.muted);add(`${n+1} / ${list.length}${s.parts>1?' ('+s.part+'/'+s.parts+')':''}`,11.5,7.0,1.1,.25,10,t.muted,{align:'right'});
  slide.addNotes([s.notes||s.body,'Source: '+(s.source||'To confirm'),'Client: '+p.client]);
 }
 return pptx.write({outputType:'blob',compression:true});
}
