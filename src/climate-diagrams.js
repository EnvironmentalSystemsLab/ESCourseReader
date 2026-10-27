import { diagramColors as c, turbo } from './palette.js';
import { monthNames, diurnalSummary, windSummary, monthlyDiurnal, hourlyVariables } from './climate.js';
import { drawPrincipleSheet } from './principle-drawings.js';
const line=(d,color=c.ink,width=1.5,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const rect=(x,y,w,h,fill=c.interior,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${c.buildingEdge}" stroke-width="1.4" ${extra}/>`;
const label=(x,y,t,extra='')=>`<text x="${x}" y="${y}" fill="${c.muted}" font-size="11" ${extra}>${t}</text>`;
const polygon=(points,fill)=>`<polygon points="${points}" fill="${fill}" stroke="${c.buildingEdge}" stroke-width="1.5"/>`;
const sun=(x,y)=>`<circle cx="${x}" cy="${y}" r="11" fill="${c.sun}"/>${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return line(`M${x+16*Math.cos(a)} ${y+16*Math.sin(a)}l${5*Math.cos(a)} ${5*Math.sin(a)}`,c.gold,1.2);}).join('')}`;
// Principle drawings live in principle-drawings.js (isometric, redrawn from the 2020 sheet).
export function drawPrinciple(family,aspect,standalone=false) {
  return drawPrincipleSheet(family,aspect,standalone);
}
function chart(title,body,height=340) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${height}" role="img" aria-label="${title}"><title>${title}</title><g font-family="Helvetica Neue,Helvetica,Arial,sans-serif">${body}</g></svg>`; }
function axes(min,max,unit,height=280) {
  return label(16,20,unit)+Array.from({length:6},(_,i)=>{const v=min+(max-min)*i/5,y=height-(height-45)*i/5;return line(`M58 ${y}H775`,c.fineGrid,1)+label(46,y+4,Math.round(v),'text-anchor="end"');}).join('');
}
function poly(points,color,width=2.5) {return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}"/>`;}
export function drawMonthly(monthly) {
  const valid=monthly.flatMap(m=>[m.p10,m.p90]).filter(Number.isFinite),lo=Math.floor(Math.min(-5,...valid)/5)*5,hi=Math.ceil(Math.max(30,...valid)/5)*5;
  if(!valid.length)return chart('Monthly temperature unavailable',label(80,140,'No valid temperature observations.'));
  const x=i=>85+i*61,y=v=>280-(v-lo)/(hi-lo)*235;
  let body=axes(lo,hi,'°C');
  for(let i=0;i<12;i++){const m=monthly[i];body+=label(x(i),305,m.name,'text-anchor="middle"');if(m.p10!==null&&m.p90!==null)body+=line(`M${x(i)} ${y(m.p10)}V${y(m.p90)}`,c.glass,17);if(m.temperature!==null)body+=`<circle cx="${x(i)}" cy="${y(m.temperature)}" r="4" fill="${c.green}"/>`;}
  // Separate segments keep missing months from being bridged by a false trend.
  for(let i=1;i<12;i++)if([monthly[i-1].temperature,monthly[i].temperature].every(Number.isFinite))body+=line(`M${x(i-1)} ${y(monthly[i-1].temperature)}L${x(i)} ${y(monthly[i].temperature)}`,c.green,2);
  return chart('Monthly dry-bulb temperature: mean and 10th to 90th percentile of hourly observations',body);
}
export function drawDiurnal(rows,month) {
  const hours=diurnalSummary(rows,month),valid=hours.flatMap(h=>[h.p10,h.p90,h.dewPoint]).filter(Number.isFinite),lo=Math.floor(Math.min(0,...valid)/5)*5,hi=Math.ceil(Math.max(30,...valid)/5)*5;
  if(!valid.length)return chart('Daily cycle unavailable',label(80,140,'No valid temperature or dew-point observations.'));
  const x=h=>58+h/24*717,y=v=>280-(v-lo)/(hi-lo)*235;
  let body=axes(lo,hi,'°C');
  const complete=hours.every(h=>[h.p10,h.p90].every(Number.isFinite));
  if(complete)body+=`<polygon points="${hours.map(h=>`${x(h.hour)},${y(h.p90)}`).join(' ')} ${[...hours].reverse().map(h=>`${x(h.hour)},${y(h.p10)}`).join(' ')}" fill="${ld(seriesColors.temperature)}" opacity=".16"/>`;
  for(const [field,color] of [['temperature',ld(seriesColors.temperature)],['dewPoint',ld(seriesColors.dewPoint)]])for(let i=1;i<24;i++)if([hours[i-1][field],hours[i][field]].every(Number.isFinite))body+=line(`M${x(hours[i-1].hour)} ${y(hours[i-1][field])}L${x(hours[i].hour)} ${y(hours[i][field])}`,color,2.5);
  for(const h of [0,4,8,12,16,20,24])body+=label(x(h),305,`${h}:00`,'text-anchor="middle"');
  return chart(`${monthNames[month-1]} mean daily temperature and dew-point cycle in local standard time`,body);
}
export function drawRadiation(monthly) {
  const max=Math.max(50,...monthly.map(m=>m.ghi||0)),hi=Math.ceil(max/50)*50,x=i=>85+i*61,y=v=>280-v/hi*235;
  let body=axes(0,hi,'kWh/m² per month');
  for(let i=0;i<12;i++){const m=monthly[i];body+=label(x(i),305,m.name,'text-anchor="middle"');if(m.ghi!==null)body+=rect(x(i)-16,y(m.ghi),32,280-y(m.ghi),c.face);if(m.dhi!==null)body+=line(`M${x(i)-20} ${y(m.dhi)}H${x(i)+20}`,c.green,3);}
  return chart('Monthly global horizontal solar energy, with diffuse horizontal energy marked separately',body);
}
export function drawWind(rows,season) {
  const w=windSummary(rows,season),max=Math.max(5,...w.bins.map(b=>b.reduce((s,v)=>s+v,0))),scale=Math.ceil(max/5)*5,cx=400,cy=169,radius=120;
  let body='';
  for(const pct of [scale/2,scale])body+=`<circle cx="${cx}" cy="${cy}" r="${pct/scale*radius}" stroke="${c.axis}" fill="none"/>${label(cx+5,cy-pct/scale*radius+13,`${pct}%`)}`;
  for(let i=0;i<8;i++){
    const angle=(i*45-90)*Math.PI/180,labels=['N','NE','E','SE','S','SW','W','NW'];
    body+=label(cx+150*Math.cos(angle),cy+150*Math.sin(angle)+4,labels[i],'text-anchor="middle"');
    let start=0;
    for(let j=0;j<3;j++){const len=w.bins[i][j]/scale*radius;body+=line(`M${cx+start*Math.cos(angle)} ${cy+start*Math.sin(angle)}l${len*Math.cos(angle)} ${len*Math.sin(angle)}`,[c.glass,c.face,c.green][j],14);start+=len;}
  }
  body+=label(50,85,'WIND COMES FROM')+label(50,108,'the plotted direction')+label(602,245,`Calm < 0.5 m/s: ${w.calm===null?'n/a':w.calm.toFixed(1)+'%'}`)+label(602,266,`${w.count.toLocaleString()} valid hours`);
  return chart('Eight-sector wind rose showing frequency and speed of winds coming from each direction',body,360);
}
// Series colors shared by the diurnal chart, its HTML legend, and the heatmap ramps.
export const seriesColors = {
  temperature:['#d33f3f','#ef7a7a'], dewPoint:['#14946a','#3cc796'], humidity:['#2a78d6','#5598e7'],
  ghi:['#e2620f','#f08a4b'], dni:['#8a3b12','#ffe3cc'], dhi:['#b58100','#e3b234']
};
const ld=([light,dark])=>`light-dark(${light}, ${dark})`;
const months=[31,28,31,30,31,30,31,31,30,31,30,31];
// Geometry is exported so the page script can map the pointer back to month, hour, and day.
export const diurnalGeometry = {left:100,width:640,pad:3,top:42,bottom:462};
function segments(points){const runs=[];let run=[];for(const p of points){if(p){run.push(p);}else if(run.length){runs.push(run);run=[];}}if(run.length)runs.push(run);return runs;}
// One plot, three scales as in ClimateStudio: temperature on the inner left axis, relative humidity on the
// outer left axis, and radiation on the right. Temperature and radiation share gridlines.
export function drawDiurnalAverages(rows) {
  const days=monthlyDiurnal(rows),{left,width,pad,top,bottom}=diurnalGeometry,mw=width/12,right=left+width;
  const x=(m,h)=>left+m*mw+pad+h/24*(mw-2*pad);
  const temps=days.flat().flatMap(h=>[h.p10,h.p90,h.temperature,h.dewPoint]).filter(Number.isFinite);
  const rads=days.flat().flatMap(h=>[h.ghi,h.dni,h.dhi]).filter(Number.isFinite);
  // The temperature axis fits the file in 5 °C steps (10 °C beyond a 60 °C range); radiation ticks share its gridlines.
  const tMin=temps.length?Math.min(...temps):0,tMax=temps.length?Math.max(...temps):10,tStep=tMax-tMin>60?10:5;
  // Separate the two families vertically: empty temperature steps are added below the data, so temperature
  // occupies the upper half of the plot, and the radiation scale is stretched so its peaks stay in the lower ~45%.
  const dataLo=Math.floor(tMin/tStep)*tStep,tHi=Math.max(dataLo+tStep*2,Math.ceil(tMax/tStep)*tStep),dataSteps=Math.round((tHi-dataLo)/tStep);
  const steps=dataSteps*2,tLo=tHi-steps*tStep,radMax=Math.max(...rads,600);
  const rStep=Math.max(50,Math.ceil(radMax/(steps*.45)/50)*50),rHi=rStep*steps;
  const y=(v,lo,hi)=>bottom-(v-lo)/(hi-lo)*(bottom-top),yT=v=>y(v,tLo,tHi),yH=v=>y(v,0,125),yR=v=>y(v,0,rHi);
  const rhAxis=left-50;
  let body='';
  for(let i=0;i<=steps;i++){const t=tLo+i*tStep,r=i*rStep,yy=yT(t);body+=line(`M${left} ${yy}H${right}`,t===0?c.axis:c.fineGrid,1);if(t>=dataLo)body+=label(left-7,yy+4,`${t}`,'text-anchor="end"');if(r<=Math.ceil(radMax/rStep)*rStep)body+=label(right+7,yy+4,`${r}`);}
  body+=line(`M${rhAxis} ${yH(100)}V${bottom}`,c.axis,1); // RH 100% sits at 80% height, below the temperature curves
  for(const v of [0,25,50,75,100])body+=line(`M${rhAxis-4} ${yH(v)}h4`,c.axis,1)+label(rhAxis-7,yH(v)+4,`${v}`,'text-anchor="end"');
  const axisTitle=(x0,anchor,text,color)=>`<g>${line(`M${anchor==='end'?x0-14:x0} ${top-22}h14`,color,2.5)}${label(anchor==='end'?x0-18:x0+18,top-18,text,`text-anchor="${anchor}" font-size="10" letter-spacing=".05em"`)}</g>`;
  body+=axisTitle(rhAxis-40,'start','RH %',ld(seriesColors.humidity))+axisTitle(left-8,'start','°C',ld(seriesColors.temperature))+axisTitle(right+48,'end','W/m²',ld(seriesColors.ghi));
  for(let m=0;m<=12;m++)body+=line(`M${left+m*mw} ${top}V${bottom}`,c.grid,1);
  for(let m=0;m<12;m++)body+=label(left+m*mw+mw/2,bottom+18,monthNames[m],'text-anchor="middle"');
  const layers=[];
  for(let m=0;m<12;m++){
    const d=days[m],poly=(key,y,width,dash)=>segments(d.map(h=>Number.isFinite(h[key])?`${x(m,h.hour).toFixed(1)},${y(h[key]).toFixed(1)}`:null)).map(run=>`<polyline points="${run.join(' ')}" fill="none" stroke="${ld(seriesColors[key])}" stroke-width="${width}" stroke-linejoin="round"${dash?` stroke-dasharray="${dash}"`:''}/>`).join('');
    let g='';
    const ghiPts=d.map(h=>Number.isFinite(h.ghi)?`${x(m,h.hour).toFixed(1)},${yR(h.ghi).toFixed(1)}`:null);
    if(ghiPts.every(Boolean))g+=`<polygon points="${x(m,0)},${bottom} ${ghiPts.join(' ')} ${x(m,24)},${bottom}" fill="${ld(seriesColors.ghi)}" opacity=".14"/>`;
    g+=poly('ghi',yR,1.6)+poly('dni',yR,1.6)+poly('dhi',yR,1.6,'4 3')+poly('humidity',yH,1.6);
    if(d.every(h=>Number.isFinite(h.p10)&&Number.isFinite(h.p90)))g+=`<polygon points="${d.map(h=>`${x(m,h.hour).toFixed(1)},${yT(h.p90).toFixed(1)}`).join(' ')} ${[...d].reverse().map(h=>`${x(m,h.hour).toFixed(1)},${yT(h.p10).toFixed(1)}`).join(' ')}" fill="${ld(seriesColors.temperature)}" opacity=".16"/>`;
    g+=poly('dewPoint',yT,1.8,'5 3')+poly('temperature',yT,2.2);
    layers.push(g);
  }
  body+=layers.join('');
  body+=label(left,bottom+36,'24 HOURS PER MONTH · LOCAL STANDARD TIME · HOURLY MEANS OF THE ACTIVE FILE','font-size="9" letter-spacing=".06em"');
  return chart('Monthly diurnal averages: for each month, the mean hourly dry-bulb and dew-point temperature on the left axis, relative humidity on a second left axis, and global, direct normal, and diffuse solar radiation on the right axis',body,bottom+48);
}
// Binned ramps. Sequential ramps run light to dark on paper and dark to bright on the dark surface.
const ramps = {
  diverging:{light:['#0d366b','#2a78d6','#9ec5f4','#f0efec','#f4b3a6','#d33f3f','#7d1717'],dark:['#b7d3f6','#3987e5','#1c3d66','#383835','#6e2a2a','#e66767','#ffc2b8']},
  aqua:{light:['#e3f6ef','#8fd9bd','#1baf7a','#11815a','#073f2d'],dark:['#17282a','#0f5a40','#199e70','#5fd0a6','#d2f5e8']},
  blue:{light:['#e6effb','#9ec5f4','#3987e5','#1c5cab','#0d366b'],dark:['#1a2430','#184f95','#2a78d6','#6da7ec','#d6e7fc']},
  orange:{light:['#fdf0e6','#f6b48f','#eb6834','#a83c12','#5c1f06'],dark:['#251c18','#7a3414','#d95926','#f39a6e','#fde3d1']},
  violet:{light:['#eeecf9','#b3aae6','#7a6cd0','#4a3aa7','#241a5e'],dark:['#1f1e2b','#3d3290','#6f62d6','#9f96ee','#e0dcfa']}
};
// Fixed domains keep colors comparable between weather files; values beyond them are clamped.
export const heatmapScales = {
  temperature:{ramp:'diverging',domain:[-30,45],mid:18,ticks:[-30,-15,0,18,30,45]},
  dewPoint:{ramp:'aqua',domain:[-35,30],ticks:[-30,-15,0,10,20,30]},
  humidity:{ramp:'blue',domain:[0,100],ticks:[0,25,50,75,100]},
  ghi:{ramp:'orange',domain:[0,1000],ticks:[0,250,500,750,1000]},
  dni:{ramp:'orange',domain:[0,1000],ticks:[0,250,500,750,1000]},
  dhi:{ramp:'orange',domain:[0,500],ticks:[0,100,200,300,400,500]},
  windSpeed:{ramp:'violet',domain:[0,15],ticks:[0,3,6,9,12,15]}
};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function sample(stops,t){const p=Math.min(stops.length-1.000001,Math.max(0,t*(stops.length-1))),i=Math.floor(p),f=p-i,a=hex(stops[i]),b=hex(stops[i+1]);return `#${a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('')}`;}
export function scalePosition(key,value){
  const {domain:[lo,hi],mid}=heatmapScales[key],v=Math.min(hi,Math.max(lo,value));
  if(mid===undefined)return (v-lo)/(hi-lo);
  return v<mid?.5*(v-lo)/(mid-lo):.5+.5*(v-mid)/(hi-mid);
}
export const heatmapBins=16;
export function binColor(key,bin){const r=ramps[heatmapScales[key].ramp],t=(bin+.5)/heatmapBins;return `light-dark(${sample(r.light,t)}, ${sample(r.dark,t)})`;}
export const heatmapGeometry = {left:58,width:717,top:34,cell:10};
export function drawHourlyHeatmap(rows,key='temperature') {
  const variable=hourlyVariables.find(v=>v.key===key)||hourlyVariables[0],scaleKey=variable.key,{left,width,top,cell}=heatmapGeometry;
  const days=Math.floor(rows.length/24),dw=width/days,paths=Array.from({length:heatmapBins},()=>[]),missing=[];
  for(let d=0;d<days;d++){
    let h=0;
    while(h<24){
      const v=rows[d*24+h]?.[variable.index],bin=Number.isFinite(v)?Math.min(heatmapBins-1,Math.floor(scalePosition(scaleKey,v)*heatmapBins)):-1;
      let end=h+1;
      while(end<24){const w=rows[d*24+end]?.[variable.index],b=Number.isFinite(w)?Math.min(heatmapBins-1,Math.floor(scalePosition(scaleKey,w)*heatmapBins)):-1;if(b!==bin)break;end++;}
      (bin<0?missing:paths[bin]).push(`M${(left+d*dw).toFixed(2)} ${top+h*cell}h${(dw+.35).toFixed(2)}v${(end-h)*cell}h-${(dw+.35).toFixed(2)}z`);
      h=end;
    }
  }
  let body=paths.map((d,i)=>d.length?`<path d="${d.join('')}" fill="${binColor(scaleKey,i)}"/>`:'').join('');
  if(missing.length)body+=`<path d="${missing.join('')}" fill="${c.mask}"/>`;
  const bottom=top+24*cell;
  body+=`<rect x="${left}" y="${top}" width="${width}" height="${24*cell}" fill="none" stroke="${c.axis}"/>`;
  let day=0;for(let m=0;m<12;m++){const x=left+day*dw;body+=line(`M${x.toFixed(1)} ${bottom}v5`,c.axis,1)+label(x+months[m]*dw/2,bottom+18,monthNames[m],'text-anchor="middle"');day+=months[m]+(m===1&&days===366?1:0);}
  for(const h of [0,6,12,18,24])body+=line(`M${left-4} ${top+h*cell}h4`,c.axis,1)+label(left-8,top+h*cell+4,`${h}:00`,'text-anchor="end"');
  body+=label(left,top-12,`${variable.label.toUpperCase()} · ${variable.unit} · EVERY HOUR OF THE YEAR, LOCAL STANDARD TIME`,'font-size="10" letter-spacing=".06em"');
  const scale=heatmapScales[scaleKey],lx=left+150,lw=420,ly=bottom+34;
  for(let i=0;i<heatmapBins;i++)body+=`<rect x="${(lx+i*lw/heatmapBins).toFixed(1)}" y="${ly}" width="${(lw/heatmapBins+.3).toFixed(1)}" height="10" fill="${binColor(scaleKey,i)}"/>`;
  for(const t of scale.ticks){const x=lx+scalePosition(scaleKey,t)*lw,end=t===scale.domain[0]&&t!==0?'≤':t===scale.domain[1]?'≥':'';body+=line(`M${x.toFixed(1)} ${ly+10}v4`,c.muted,1)+label(x,ly+27,`${end}${t}`,'text-anchor="middle" font-size="10"');}
  body+=label(lx-10,ly+9,variable.unit,'text-anchor="end"');
  if(scale.mid!==undefined)body+=label(lx+lw+10,ly+9,`neutral at ${scale.mid} °C`,'font-size="10"');
  return chart(`Hourly heatmap of ${variable.label.toLowerCase()} for every day and hour of the active weather file`,body,bottom+75);
}
