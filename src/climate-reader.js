import { climateSummary, windSummary, monthNames, parseEPW, monthlyDiurnal, hourlyVariables, mean } from './climate.js';
import { drawRadiation, drawWind, drawDiurnalAverages, drawHourlyHeatmap, diurnalGeometry, heatmapGeometry } from './climate-diagrams.js';
import { defaultWeather } from './climate-data.js';
import { datasets, defaultDatasetId } from './climate-datasets.js';

const $=id=>document.getElementById(id);
const set=(id,value)=>{$(id).textContent=value;};
const fullMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt=(value,digits=0)=>Number.isFinite(value)?value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}):'Unavailable';
let weather=defaultWeather,summary=climateSummary(weather.rows),imported=false,activeId=defaultDatasetId,uploadName='';
let averageDays=monthlyDiurnal(weather.rows),heatmapKey='temperature';
// The design sheet is the index; one principle and its climate family are shown in detail below it.
const cards=[...document.querySelectorAll('.principle-card')];
function selectCard(id,scroll=false){
  const card=cards.find(c=>c.id===id)||cards.find(c=>c.id==='card-temperate-form')||cards[0];if(!card)return;
  const family=card.dataset.family;
  for(const c of cards)c.hidden=c!==card;
  for(const note of document.querySelectorAll('.family-note'))note.hidden=note.dataset.family!==family;
  for(const cell of document.querySelectorAll('.matrix-cell')){const on=cell.hash===`#${card.id}`;cell.classList.toggle('is-selected',on);if(on)cell.setAttribute('aria-current','true');else cell.removeAttribute('aria-current');}
  for(const row of document.querySelectorAll('.principle-matrix tbody tr'))row.classList.toggle('is-family',row.dataset.family===family);
  set('detail-position',`PRINCIPLE ${cards.indexOf(card)+1} OF ${cards.length}`);
  if(scroll)$('principle-detail').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  return card;
}
for(const link of document.querySelectorAll('[data-matrix-family]'))link.addEventListener('click',event=>{
  event.preventDefault();const card=selectCard(link.hash.slice(1),true);history.replaceState(null,'',`#${card.id}`);
});
for(const button of document.querySelectorAll('[data-card-step]'))button.addEventListener('click',()=>{
  const current=cards.findIndex(c=>!c.hidden),next=cards[(current+Number(button.dataset.cardStep)+cards.length)%cards.length];
  selectCard(next.id);history.replaceState(null,'',`#${next.id}`);
});
selectCard(location.hash.slice(1));
if(/^#card-/.test(location.hash))$('principle-detail').scrollIntoView();
function renderWind(){
  const season=$('wind-season').value,w=windSummary(weather.rows,season);
  $('wind-chart').innerHTML=drawWind(weather.rows,season);
  const totals=w.bins.map(b=>b.reduce((s,v)=>s+v,0)),max=Math.max(...totals),sector=totals.indexOf(max),directions=['north','northeast','east','southeast','south','southwest','west','northwest'];
  set('wind-reading',w.count?`${max>0?`The largest moving-wind sector is from the ${directions[sector]}: ${fmt(max,1)}% of valid hours.`:'All valid hours are calm.'} Calm conditions account for ${fmt(w.calm,1)}%. ${w.excluded?`${w.excluded} hours with missing wind values are excluded. `:''}Use the seasonal directions to propose shelter or an air path, then test the local conditions.`:'No valid wind observations are available for this period.');
}
const hourLabel=h=>`${String(h).padStart(2,'0')}:00-${String(h+1).padStart(2,'0')}:00`;
const unitValue=(v,variable)=>Number.isFinite(v)?`${fmt(v,variable.digits)} ${variable.unit}`:'missing';
function renderAverages(){
  averageDays=monthlyDiurnal(weather.rows);
  $('diurnal-averages-chart').innerHTML=drawDiurnalAverages(weather.rows);
  const swing=k=>averageDays.map((d,i)=>{const v=d.map(h=>h[k]).filter(Number.isFinite);return {name:fullMonths[i],range:v.length===24?Math.max(...v)-Math.min(...v):null};}).filter(m=>m.range!==null);
  const t=swing('temperature'),dew=swing('dewPoint'),rh=swing('humidity');
  if(!t.length){set('diurnal-averages-reading','No complete monthly temperature cycles are available in this file.');return;}
  const wide=t.reduce((a,b)=>b.range>a.range?b:a),narrow=t.reduce((a,b)=>b.range<a.range?b:a),dewWide=dew.find(m=>m.name===wide.name),rhWide=rh.find(m=>m.name===wide.name);
  const peak=averageDays.flatMap((d,i)=>d.map(h=>({month:fullMonths[i],hour:h.hour,ghi:h.ghi}))).filter(h=>Number.isFinite(h.ghi)).reduce((a,b)=>!a||b.ghi>a.ghi?b:a,null);
  set('diurnal-averages-reading',`${wide.name} has the widest average day: dry bulb swings ${fmt(wide.range,1)}°C${dewWide?`, while the dew point moves only ${fmt(dewWide.range,1)}°C`:''}${rhWide?` and RH changes by ${fmt(rhWide.range)} percentage points`:''}. ${narrow.name} has the flattest day (${fmt(narrow.range,1)}°C).${peak?` The strongest average hour of sun is ${peak.month}, ${hourLabel(Math.floor(peak.hour))}, at ${fmt(peak.ghi)} W/m² on the horizontal.`:''} These are averages: individual days swing more.`);
}
const variableNotes={
  temperature:'Read horizontal bands for the daily cycle and vertical streaks for weather: a cold snap or a heat wave spans several days. Blue hours sit below the 18°C degree-day base, red hours above it.',
  dewPoint:'The dew point changes slowly through the day and tracks air masses over days. Long, dark bands mark muggy periods when outdoor air cannot dry a room.',
  humidity:'RH rises at night and falls in the afternoon even when the moisture content stays the same. Switch to the dew point to separate moisture from temperature.',
  ghi:'The colored area traces day length; its edges follow sunrise and sunset in standard time. Pale gaps inside it are cloudy days.',
  dni:'Beam radiation needs a clear line to the sun. Patchy DNI means cloud; strong, continuous DNI rewards shading devices that block the beam.',
  dhi:'Diffuse sky radiation arrives even on overcast days, so it is steadier than DNI. High DHI means the whole sky, not only the sun, must be controlled.',
  windSpeed:'Wind often strengthens in the afternoon, when the sun-warmed ground stirs the air, and calms at night. Station wind is measured at about 10 m in open terrain.'
};
const variableButtons=hourlyVariables.map(v=>{const b=document.createElement('button');b.type='button';b.dataset.variable=v.key;b.textContent=v.short;b.title=v.label;$('heatmap-variables').append(b);return b;});
function renderHeatmap(){
  const variable=hourlyVariables.find(v=>v.key===heatmapKey);
  for(const b of variableButtons){const on=b.dataset.variable===heatmapKey;b.setAttribute('aria-pressed',String(on));b.tabIndex=on?0:-1;}
  $('heatmap-chart').innerHTML=drawHourlyHeatmap(weather.rows,heatmapKey);
  const values=weather.rows.map(r=>r[variable.index]).filter(Number.isFinite);
  set('heatmap-reading',values.length?`${variable.label}: ${unitValue(Math.min(...values),variable)} to ${unitValue(Math.max(...values),variable)}, annual mean ${unitValue(mean(values),variable)} across ${fmt(values.length)} valid hours. ${variableNotes[heatmapKey]}`:`No valid ${variable.label.toLowerCase()} values are available in this file.`);
}
function cycle(step){const i=hourlyVariables.findIndex(v=>v.key===heatmapKey),next=hourlyVariables[(i+step+hourlyVariables.length)%hourlyVariables.length];heatmapKey=next.key;renderHeatmap();return next;}
for(const b of variableButtons){
  b.addEventListener('click',()=>{heatmapKey=b.dataset.variable;renderHeatmap();});
  b.addEventListener('keydown',event=>{const step={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];if(!step)return;event.preventDefault();const next=cycle(step);variableButtons.find(x=>x.dataset.variable===next.key).focus();});
}
$('heatmap-next').addEventListener('click',()=>cycle(1));
// Pointer readouts: map the pointer into SVG coordinates, then back to month/hour or day/hour.
function tooltipFor(figure){let tip=figure.querySelector('.chart-tooltip');if(!tip){tip=document.createElement('div');tip.className='chart-tooltip';tip.hidden=true;figure.append(tip);}return tip;}
function svgPoint(svg,event){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
function showTip(figure,event,html,guideX){
  const tip=tooltipFor(figure),box=figure.getBoundingClientRect();tip.innerHTML=html;tip.hidden=false;
  const x=event.clientX-box.left+figure.scrollLeft,flip=event.clientX-box.left>box.width*.6;
  tip.style.left=`${flip?x-tip.offsetWidth-14:x+14}px`;tip.style.top=`${Math.max(4,event.clientY-box.top-tip.offsetHeight/2)}px`;
  const svg=figure.querySelector('svg');let guide=svg.querySelector('.hover-guide');
  if(!guide){guide=document.createElementNS('http://www.w3.org/2000/svg','line');guide.setAttribute('class','hover-guide');svg.append(guide);}
  for(const [k,v] of Object.entries(guideX))guide.setAttribute(k,v);
}
function hideTip(figure){const tip=figure.querySelector('.chart-tooltip');if(tip)tip.hidden=true;figure.querySelector('.hover-guide')?.remove();}
function averagesTarget(event){
  const svg=$('diurnal-averages-chart').querySelector('svg');if(!svg)return null;
  const {left,width,pad,top,bottom}=diurnalGeometry,mw=width/12,p=svgPoint(svg,event);
  if(p.x<left||p.x>left+width||p.y<top||p.y>bottom)return null;
  const m=Math.min(11,Math.floor((p.x-left)/mw)),h=Math.max(0,Math.min(23,Math.floor((p.x-left-m*mw-pad)/(mw-2*pad)*24)));
  return {m,h,x:left+m*mw+pad+(h+.5)/24*(mw-2*pad)};
}
const averagesFigure=$('diurnal-averages-chart');
averagesFigure.addEventListener('pointermove',event=>{
  const t=averagesTarget(event);if(!t){hideTip(averagesFigure);return;}
  const d=averageDays[t.m][t.h],v=(k,digits,unit)=>Number.isFinite(d[k])?`${fmt(d[k],digits)}${unit}`:'n/a',{top,bottom}=diurnalGeometry;
  showTip(averagesFigure,event,`<strong>${monthNames[t.m]} · ${hourLabel(t.h)}</strong><span>Dry bulb ${v('temperature',1,' °C')} · dew point ${v('dewPoint',1,' °C')}</span><span>RH ${v('humidity',0,'%')}</span><span>GHI ${v('ghi',0,'')} · DNI ${v('dni',0,'')} · DHI ${v('dhi',0,'')} W/m²</span>`,{x1:t.x,x2:t.x,y1:top,y2:bottom});
});
averagesFigure.addEventListener('pointerleave',()=>hideTip(averagesFigure));
const heatmapFigure=$('heatmap-chart');
heatmapFigure.addEventListener('pointermove',event=>{
  const svg=heatmapFigure.querySelector('svg');if(!svg)return;
  const {left,width,top,cell}=heatmapGeometry,days=Math.floor(weather.rows.length/24),p=svgPoint(svg,event);
  if(p.x<left||p.x>=left+width||p.y<top||p.y>=top+24*cell){hideTip(heatmapFigure);return;}
  const day=Math.min(days-1,Math.floor((p.x-left)/width*days)),hour=Math.floor((p.y-top)/cell),row=weather.rows[day*24+hour],variable=hourlyVariables.find(v=>v.key===heatmapKey);
  const x=left+(day+.5)*width/days;
  showTip(heatmapFigure,event,`<strong>${monthNames[row[0]-1]} ${row[1]} · ${hourLabel(hour)}</strong><span>${variable.label}: ${unitValue(row[variable.index],variable)}</span>`,{x1:x,x2:x,y1:top,y2:top+24*cell});
});
heatmapFigure.addEventListener('pointerleave',()=>hideTip(heatmapFigure));
function renderWeather(){
  summary=climateSummary(weather.rows);
  const dataset=imported?null:datasets.find(d=>d.id===activeId);
  const box=$('climate-interpretation');box.hidden=!dataset;
  if(dataset)box.innerHTML=`<p class="eyebrow" id="interpretation-title">WORKED INTERPRETATION / ${dataset.name.toUpperCase()}</p>${dataset.reading.map(([lead,text])=>`<p><strong>${lead}</strong> ${text}</p>`).join('')}`;
  set('dataset-name',dataset?`${dataset.name} · ${weather.location}`:weather.location);
  const coordinates=`${Math.abs(weather.latitude).toFixed(3)}° ${weather.latitude<0?'S':'N'}, ${Math.abs(weather.longitude).toFixed(3)}° ${weather.longitude<0?'W':'E'}`;
  set('dataset-meta',`${weather.dataset}${dataset?' · source period 2009-2023':''}${dataset?` · Köppen ${dataset.koppen}`:''} · station ${weather.station} · ${coordinates} · ${weather.elevation} m · UTC${weather.utcOffset>=0?'+':''}${weather.utcOffset} standard time · ${weather.rows.length.toLocaleString()} hours`);
  set('dataset-quality',weather.missing?`${weather.missing.toLocaleString()} missing or out-of-range values in the analyzed fields. Means exclude missing values; incomplete energy and degree-day totals are unavailable.`:'No missing or out-of-range values detected in the analyzed fields. This checks format and ranges, rather than measurement accuracy.');
  for(const select of document.querySelectorAll('[data-dataset-select]')){
    let upload=select.querySelector('option[value="upload"]');
    if(imported){if(!upload){upload=document.createElement('option');upload.value='upload';select.append(upload);}upload.textContent=`Your file · ${uploadName}`;}else upload?.remove();
    select.value=imported?'upload':activeId;
  }
  set('annual-mean',summary.temperature===null?'Unavailable':`${fmt(summary.temperature,1)}°C`);
  set('annual-hdd',fmt(summary.hdd));set('annual-cdd',fmt(summary.cdd));set('annual-solar',fmt(summary.ghi));
  $('radiation-chart').innerHTML=drawRadiation(summary.monthly);
  const rad=summary.monthly.filter(m=>Number.isFinite(m.ghi));
  if(rad.length){const peak=rad.reduce((a,b)=>a.ghi>b.ghi?a:b);set('radiation-reading',`${peak.name} has the largest horizontal solar total: ${fmt(peak.ghi)} kWh/m². The annual GHI total is ${fmt(summary.ghi)} kWh/m². Combine this availability with the season of need and the receiving facade; it is not transmitted window gain.`);}else set('radiation-reading','No complete monthly radiation totals are available. Missing radiation values are not treated as zero.');
  $('monthly-data').querySelector('tbody').innerHTML=summary.monthly.map(m=>`<tr><th scope="row">${m.name}</th>${['temperature','min','max','ghi','dhi','hdd','cdd'].map(k=>`<td>${fmt(m[k],1)}</td>`).join('')}</tr>`).join('');
  renderAverages();renderHeatmap();renderWind();
}
// Bundled climates beyond Ithaca load on demand as classic scripts, which also work from file://.
const loaded={[defaultDatasetId]:defaultWeather};
function loadDataset(id){
  if(loaded[id])return Promise.resolve(loaded[id]);
  return new Promise((resolve,reject)=>{
    const done=()=>window.ES1Weather?.[id]?resolve(loaded[id]=window.ES1Weather[id]):reject(new Error('The weather file could not be read.'));
    if(window.ES1Weather?.[id]){done();return;}
    const script=document.createElement('script');script.src=`./assets/weather/data/${id}.js`;script.onload=done;script.onerror=()=>reject(new Error('The weather file could not be loaded.'));document.head.append(script);
  });
}
async function selectDataset(id){
  const dataset=datasets.find(d=>d.id===id);if(!dataset)return;
  set('file-status',`Loading ${dataset.name}…`);
  try{weather=await loadDataset(id);activeId=id;imported=false;renderWeather();set('file-status',`Showing ${dataset.name}, TMYx 2009-2023.`);}
  catch(error){set('file-status',`${error.message} The previous dataset remains active.`);renderWeather();}
}
for(const select of document.querySelectorAll('[data-dataset-select]'))select.addEventListener('change',()=>{if(select.value!=='upload')selectDataset(select.value);});
for(const button of document.querySelectorAll('[data-load-dataset]'))button.addEventListener('click',async()=>{await selectDataset(button.dataset.loadDataset);$('analysis').scrollIntoView({block:'start'});});
$('wind-season').addEventListener('change',renderWind);
$('epw-input').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  if(file.size>8_000_000){set('file-status','Choose an hourly EPW smaller than 8 MB. The previous dataset remains active.');event.target.value='';return;}
  try{const next=parseEPW(await file.text());weather=next;imported=true;uploadName=file.name;renderWeather();set('file-status',`Loaded ${file.name}. Check the source period and quality in the original file header.`);}catch(error){set('file-status',`${error.message} The previous dataset remains active.`);}
  event.target.value='';
});
function download(content,type,filename){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download-climate-csv').addEventListener('click',()=>{
  const header=['month','mean_temperature_C','mean_daily_min_C','mean_daily_max_C','GHI_kWh_m2','DHI_kWh_m2','HDD18_C_days','CDD18_C_days'];
  const records=summary.monthly.map(m=>[m.name,...['temperature','min','max','ghi','dhi','hdd','cdd'].map(k=>Number.isFinite(m[k])?m[k].toFixed(3):'')]);
  const quote=v=>`"${String(v).replaceAll('"','""')}"`;
  const meta=[['dataset',`Station ${weather.station}: ${weather.location}`],['source',imported?'User-supplied EPW; consult its original header':'TMYx 2009-2023, Climate.OneBuilding.org'],['time_basis','Local standard time; hourly interval ending at EPW hour/minute'],['missing_values','Blank totals are unavailable, not zero']];
  download([...meta,[],header,...records].map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8','climate-monthly-summary.csv');
});
const menu=$('menu-toggle'),sidebar=$('sidebar'),mobile=window.matchMedia('(max-width:900px)');
function sync(){sidebar.inert=mobile.matches&&menu.getAttribute('aria-expanded')!=='true';}
function close(){sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');sync();}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));sidebar.classList.toggle('open',open);sync();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=menu.getAttribute('aria-expanded')==='true';close();if(open&&mobile.matches)menu.focus();}});
document.addEventListener('click',event=>{if(!sidebar.contains(event.target)&&!menu.contains(event.target))close();});
for(const a of sidebar.querySelectorAll('a'))a.addEventListener('click',close);
mobile.addEventListener('change',close);sync();
const nav=[...sidebar.querySelectorAll('nav a')],sections=nav.map(a=>document.querySelector(a.hash));let scheduled=false;
function progress(){const total=document.documentElement.scrollHeight-window.innerHeight,pct=total>0?Math.max(0,Math.min(100,Math.round(window.scrollY/total*100))):0;set('progress-number',`${pct}%`);$('reading-progress').style.width=`${pct}%`;let current=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<window.innerHeight*.35)current=section;for(const a of nav){const active=a.hash===`#${current.id}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}scheduled=false;}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(progress);}},{passive:true});window.addEventListener('resize',progress);
renderWeather();progress();
