// EPW positions are zero-based here. Column 6 contains source/uncertainty flags.
// Only full-year, one-record-per-hour files are supported by this reader.
export const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const weatherColumns = ['month','day','hour','temperature','dewPoint','humidity','ghi','dni','dhi','windDirection','windSpeed'];
export function parseEPW(source) {
  const lines = source.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const location = lines[0]?.split(',');
  if (location?.[0] !== 'LOCATION' || lines.length < 9) throw new Error('Choose an EPW file with its eight header lines.');
  const period = lines[7].split(',');
  if (period[0] !== 'DATA PERIODS' || Number(period[1]) !== 1 || Number(period[2]) !== 1) throw new Error('This reader requires one data period with one record per hour.');
  const cells = lines.slice(8).filter(line => line.trim()).map(line => line.split(','));
  if (![8760,8784].includes(cells.length)) throw new Error('A complete 8,760- or 8,784-hour year is required.');
  const leap = cells.length === 8784;
  const calendar = [31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  let index = 0, missing = 0;
  const clean = (cell, min, max) => {
    const n = cell?.trim() === '' ? NaN : Number(cell);
    if (!Number.isFinite(n) || n < min || n > max) { missing++; return null; }
    return n;
  };
  const rows = [];
  const minuteConvention=Number(cells[0][4]);
  if(![0,60].includes(minuteConvention))throw new Error('Hourly minute fields must consistently use 0 or 60. Subhourly data is not supported.');
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= calendar[m-1]; d++) for (let h = 1; h <= 24; h++) {
    const c = cells[index++];
    if (c.length < 22 || +c[1] !== m || +c[2] !== d || +c[3] !== h || +c[4] !== minuteConvention) throw new Error('Hourly rows must run in calendar order from January 1, hour 1, to December 31, hour 24, with a consistent minute field.');
    rows.push([m,d,h,clean(c[6],-70,70),clean(c[7],-70,70),clean(c[8],0,110),clean(c[13],0,9998),clean(c[14],0,9998),clean(c[15],0,9998),clean(c[20],0,360),clean(c[21],0,40)]);
  }
  const [latitude,longitude,utcOffset,elevation] = location.slice(6,10).map(Number);
  if (location.slice(6,10).some(v=>!v?.trim()) || ![latitude,longitude,utcOffset,elevation].every(Number.isFinite) || Math.abs(latitude)>90 || Math.abs(longitude)>180 || Math.abs(utcOffset)>14) throw new Error('The LOCATION header has invalid coordinates or a time zone.');
  return { location:location[1].replaceAll('.',' '), region:location[2], country:location[3], dataset:location[4], station:location[5], latitude,longitude,utcOffset,elevation,minuteConvention,missing,rows };
}
export function mean(values) { const a=values.filter(Number.isFinite);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null; }
export function quantile(values,p) {
  const a=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return null;
  const i=(a.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo);
}
export function monthlySummary(rows) {
  return monthNames.map((name,i)=>{
    const rs=rows.filter(r=>r[0]===i+1),days=new Map();
    for(const r of rs){if(!days.has(r[1]))days.set(r[1],[]);days.get(r[1]).push(r[3]);}
    const completeDays=[...days.values()].filter(ts=>ts.every(Number.isFinite));
    const daily=completeDays.map(ts=>mean(ts));
    const sumRadiation=col=>rs.length&&rs.every(r=>Number.isFinite(r[col]))?rs.reduce((s,r)=>s+r[col],0)/1000:null;
    return {name,count:rs.length,temperature:mean(rs.map(r=>r[3])),p10:quantile(rs.map(r=>r[3]),.1),p90:quantile(rs.map(r=>r[3]),.9),
      min:mean(completeDays.map(ts=>Math.min(...ts))),max:mean(completeDays.map(ts=>Math.max(...ts))),
      hdd:days.size&&daily.length===days.size?daily.reduce((s,t)=>s+Math.max(0,18-t),0):null,
      cdd:days.size&&daily.length===days.size?daily.reduce((s,t)=>s+Math.max(0,t-18),0):null,
      ghi:sumRadiation(6),dni:sumRadiation(7),dhi:sumRadiation(8)};
  });
}
export function diurnalSummary(rows,month) {
  return Array.from({length:24},(_,i)=>{
    const rs=rows.filter(r=>r[0]===month&&r[2]===i+1);
    return {hour:i+.5,temperature:mean(rs.map(r=>r[3])),dewPoint:mean(rs.map(r=>r[4])),humidity:mean(rs.map(r=>r[5])),p10:quantile(rs.map(r=>r[3]),.1),p90:quantile(rs.map(r=>r[3]),.9),
      ghi:mean(rs.map(r=>r[6])),dni:mean(rs.map(r=>r[7])),dhi:mean(rs.map(r=>r[8]))};
  });
}
// Twelve monthly average days: the layout of ClimateStudio's and Climate Consultant's diurnal charts.
export function monthlyDiurnal(rows) { return monthNames.map((_,i)=>diurnalSummary(rows,i+1)); }
// Hourly variables offered by the heatmap. Index is the zero-based position in a parsed row.
export const hourlyVariables = [
  {key:'temperature',index:3,label:'Dry-bulb temperature',short:'Dry bulb',unit:'°C',digits:1},
  {key:'dewPoint',index:4,label:'Dew-point temperature',short:'Dew point',unit:'°C',digits:1},
  {key:'humidity',index:5,label:'Relative humidity',short:'RH',unit:'%',digits:0},
  {key:'ghi',index:6,label:'Global horizontal radiation',short:'GHI',unit:'Wh/m²',digits:0},
  {key:'dni',index:7,label:'Direct normal radiation',short:'DNI',unit:'Wh/m²',digits:0},
  {key:'dhi',index:8,label:'Diffuse horizontal radiation',short:'DHI',unit:'Wh/m²',digits:0},
  {key:'windSpeed',index:10,label:'Wind speed',short:'Wind',unit:'m/s',digits:1}
];
// A compact profile for comparing climates side by side. Daily range averages each complete day's max minus min.
export function climateProfile(rows) {
  const s=climateSummary(rows),m=s.monthly,ranges=m.map(x=>Number.isFinite(x.max)&&Number.isFinite(x.min)?x.max-x.min:null);
  const warmest=m.filter(x=>Number.isFinite(x.temperature)).reduce((a,b)=>!a||b.temperature>a.temperature?b:a,null);
  const coldest=m.filter(x=>Number.isFinite(x.temperature)).reduce((a,b)=>!a||b.temperature<a.temperature?b:a,null);
  const warmIndex=warmest?monthNames.indexOf(warmest.name)+1:null;
  return {temperature:s.temperature,coldest,warmest,dailyRange:mean(ranges),
    warmDewPoint:warmIndex?mean(rows.filter(r=>r[0]===warmIndex).map(r=>r[4])):null,
    hdd:s.hdd,cdd:s.cdd,ghi:s.ghi,hot:s.hot,freezing:s.freezing};
}
export function windSummary(rows,season='all') {
  const months=season==='winter'?[12,1,2]:season==='summer'?[6,7,8]:monthNames.map((_,i)=>i+1);
  const rs=rows.filter(r=>months.includes(r[0]));
  // A calm needs a valid speed, but no direction. Directionless moving air is excluded.
  const valid=rs.filter(r=>Number.isFinite(r[10])&&(r[10]<.5||Number.isFinite(r[9])));
  const bins=Array.from({length:8},()=>[0,0,0]);let calm=0;
  for(const r of valid){if(r[10]<.5){calm++;continue;}const b=Math.floor(((r[9]+22.5)%360)/45);bins[b][r[10]<2?0:r[10]<5?1:2]++;}
  return {bins:bins.map(b=>b.map(n=>valid.length?n/valid.length*100:0)),calm:valid.length?calm/valid.length*100:null,count:valid.length,excluded:rs.length-valid.length};
}
export function climateSummary(rows) {
  const monthly=monthlySummary(rows),temps=rows.map(r=>r[3]).filter(Number.isFinite);
  const total=key=>monthly.every(m=>Number.isFinite(m[key]))?monthly.reduce((s,m)=>s+m[key],0):null;
  return {monthly,temperature:mean(temps),hdd:total('hdd'),cdd:total('cdd'),ghi:total('ghi'),temperatureHours:temps.length,
    freezing:temps.filter(t=>t<0).length,hot:temps.filter(t=>t>26).length};
}
