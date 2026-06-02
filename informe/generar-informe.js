/* ════════════════════════════════════════════════════════════════
   Generador del Informe Retrospectivo — San Sonorín XI
   Lee el backup JSON de la edición y emite un HTML autocontenido
   (gráficos SVG inline, sin dependencias, funciona offline).
   Uso:  node generar-informe.js <ruta-al-backup.json>
═══════════════════════════════════════════════════════════════════ */
const fs = require('fs');

const SRC = process.argv[2] || 'sonora-backup-2026-06-02.json';
const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// ---- Config de la edición ----
const EDITION = 'San Sonorín XI';
const EVENT_DATE = '29–31 mayo 2026';
const GEN_DATE = '2 junio 2026';
const SET = { botePct: 10, botePrevio: 0, presupuesto: 6000 };
const CREW = ['Panda', 'Dsastre', 'Gurke', 'Droglo', 'Magdalena', 'Cizette', 'Francis'];
// Paleta estable por persona
const CCOL = {
  Panda: '#60a5fa', Dsastre: '#f472b6', Gurke: '#34d399', Droglo: '#fbbf24',
  Magdalena: '#a78bfa', Cizette: '#fb7185', Francis: '#22d3ee'
};
const RAMA_LABEL = {
  sonido: 'Sonido', local: 'Local', logistica: 'Logística', decoracion: 'Decoración',
  montaje: 'Montaje', desmontaje: 'Comida y bebida', cartel: 'Cartel/Artistas', otros: 'Otros'
};
const RAMA_COL = {
  sonido: '#3b82f6', local: '#6366f1', logistica: '#0ea5e9', decoracion: '#ec4899',
  montaje: '#f59e0b', desmontaje: '#10b981', cartel: '#a855f7', otros: '#94a3b8'
};

const eur = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const eur0 = n => Math.round(n).toLocaleString('es-ES') + ' €';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ──────────────── CÁLCULOS ──────────────── */
const P = d.payments;
const recaudado = P.reduce((s, p) => s + (p.amount || 0), 0);
const entradas = P.reduce((s, p) => s + (p.tickets || 0), 0);
const ticketMedio = recaudado / entradas;
const bote = recaudado * SET.botePct / 100 + SET.botePrevio;
const libre = recaudado - bote;

const reales = d.expenses.filter(e => e.tipo !== 'prevision');
const prevs = d.expenses.filter(e => e.tipo === 'prevision');
const gReal = reales.reduce((s, e) => s + (e.amount || 0), 0);
const gPrev = prevs.reduce((s, e) => s + (e.amount || 0), 0);
const dispReal = SET.presupuesto - gReal;

// Recaudado por cobrador
const recBy = {}; CREW.forEach(n => recBy[n] = { eur: 0, n: 0 });
P.forEach(p => { if (recBy[p.to]) { recBy[p.to].eur += p.amount || 0; recBy[p.to].n++; } });

// Adelantado por persona (gasto real)
const advBy = {}; CREW.forEach(n => advBy[n] = { eur: 0, n: 0 });
reales.forEach(e => { if (advBy[e.paidBy]) { advBy[e.paidBy].eur += e.amount || 0; advBy[e.paidBy].n++; } });

// Balance neto
const net = {}; CREW.forEach(n => net[n] = recBy[n].eur - advBy[n].eur);
const sumNet = CREW.reduce((s, n) => s + net[n], 0);

// Gasto real por rama
const realRama = {}; reales.forEach(e => realRama[e.rama] = (realRama[e.rama] || 0) + (e.amount || 0));
const prevRama = {}; prevs.forEach(e => prevRama[e.rama] = (prevRama[e.rama] || 0) + (e.amount || 0));

// Ventas acumuladas por fecha
const byDate = {};
P.forEach(p => { const k = new Date(p.ts).toISOString().slice(0, 10); if (!byDate[k]) byDate[k] = { eur: 0, t: 0 }; byDate[k].eur += p.amount; byDate[k].t += p.tickets || 0; });
const dates = Object.keys(byDate).sort();
let acc = 0, accT = 0;
const cum = dates.map(k => { acc += byDate[k].eur; accT += byDate[k].t; return { date: k, eur: acc, t: accT }; });

// Ventas por mes
const byMonth = {}; P.forEach(p => { const m = new Date(p.ts).toISOString().slice(0, 7); if (!byMonth[m]) byMonth[m] = { eur: 0, t: 0 }; byMonth[m].eur += p.amount; byMonth[m].t += p.tickets || 0; });

// Entradas por tipo de día
const byDay = {}; P.forEach(p => { byDay[p.day] = (byDay[p.day] || 0) + (p.tickets || 0); });

// Tareas
const T = d.tasks;
const tSt = {}; T.forEach(t => tSt[t.status] = (tSt[t.status] || 0) + 1);
const tRama = {}; T.forEach(t => tRama[t.rama] = (tRama[t.rama] || 0) + 1);
const tPend = T.filter(t => t.status !== 'hecho');

// Decisiones
const DE = d.decisions;
const dSt = {}; DE.forEach(x => dSt[x.status] = (dSt[x.status] || 0) + 1);

/* ──────────────── HELPERS SVG ──────────────── */
function svgBarsV(data, { w = 560, h = 240, fmt = eur0, pad = 34 } = {}) {
  // data: [{label, value, color, sub}]
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;
  const gap = 14, plotH = h - pad - 28, plotW = w - 20;
  const bw = (plotW - gap * (n - 1)) / n;
  let bars = '';
  data.forEach((d, i) => {
    const bh = Math.max((d.value / max) * plotH, 2);
    const x = 10 + i * (bw + gap), y = pad + (plotH - bh);
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="5" fill="${d.color}"/>`;
    bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="bl" font-weight="700">${fmt(d.value)}</text>`;
    bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(pad + plotH + 16).toFixed(1)}" text-anchor="middle" class="bx">${esc(d.label)}</text>`;
    if (d.sub) bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(pad + plotH + 27).toFixed(1)}" text-anchor="middle" class="bs">${esc(d.sub)}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${bars}</svg>`;
}

function svgBarsH(data, { w = 560, rowH = 30, fmt = eur0, labelW = 90 } = {}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const h = data.length * rowH + 10;
  const plotW = w - labelW - 70;
  let rows = '';
  data.forEach((d, i) => {
    const y = 8 + i * rowH;
    const bw = Math.max((d.value / max) * plotW, d.value > 0 ? 3 : 0);
    rows += `<text x="${labelW - 8}" y="${y + rowH / 2 + 4}" text-anchor="end" class="bx" font-weight="600">${esc(d.label)}</text>`;
    rows += `<rect x="${labelW}" y="${y + 4}" width="${plotW}" height="${rowH - 12}" rx="4" fill="rgba(255,255,255,.05)"/>`;
    rows += `<rect x="${labelW}" y="${y + 4}" width="${bw.toFixed(1)}" height="${rowH - 12}" rx="4" fill="${d.color}"/>`;
    rows += `<text x="${labelW + bw + 8}" y="${y + rowH / 2 + 4}" class="bl" font-weight="700">${fmt(d.value)}${d.sub ? ' <tspan class="bs">' + esc(d.sub) + '</tspan>' : ''}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${rows}</svg>`;
}

function svgDonut(data, { size = 230, fmt = eur0 } = {}) {
  // data: [{label, value, color}]
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 6, ir = r * 0.58;
  let a0 = -Math.PI / 2, paths = '';
  data.forEach(d => {
    const frac = d.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a1), yi0 = cy + ir * Math.sin(a1);
    const xi1 = cx + ir * Math.cos(a0), yi1 = cy + ir * Math.sin(a0);
    paths += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${xi0.toFixed(1)},${yi0.toFixed(1)} A${ir},${ir} 0 ${large} 0 ${xi1.toFixed(1)},${yi1.toFixed(1)} Z" fill="${d.color}"/>`;
    a0 = a1;
  });
  const legend = data.map(d => `<div class="leg"><span class="dot" style="background:${d.color}"></span>${esc(d.label)} <b>${fmt(d.value)}</b> <span class="bs">${(d.value / total * 100).toFixed(0)}%</span></div>`).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 ${size} ${size}" class="donut"><text x="${cx}" y="${cy - 4}" text-anchor="middle" class="dn-c">${fmt(total)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="dn-s">total</text>${paths}</svg><div class="legend">${legend}</div></div>`;
}

function svgLine(points, { w = 600, h = 240, pad = 40 } = {}) {
  const maxY = Math.max(...points.map(p => p.eur));
  const n = points.length;
  const plotW = w - pad - 14, plotH = h - pad - 24;
  const X = i => pad + (i / (n - 1)) * plotW;
  const Y = v => pad / 2 + plotH - (v / maxY) * plotH;
  // gridlines
  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const v = maxY * g / 4, y = Y(v);
    grid += `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${w - 14}" y2="${y.toFixed(1)}" class="grid"/>`;
    grid += `<text x="${pad - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" class="bs">${eur0(v)}</text>`;
  }
  const dPath = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.eur).toFixed(1)}`).join(' ');
  const area = `M${X(0).toFixed(1)},${Y(0).toFixed(1)} ` + points.map((p, i) => `L${X(i).toFixed(1)},${Y(p.eur).toFixed(1)}`).join(' ') + ` L${X(n - 1).toFixed(1)},${Y(0).toFixed(1)} Z`;
  // x labels: primero, intermedio, último
  const idxs = [0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1];
  let xlab = '';
  idxs.forEach(i => { const dd = new Date(points[i].date); xlab += `<text x="${X(i).toFixed(1)}" y="${h - 4}" text-anchor="middle" class="bs">${dd.getDate()}/${dd.getMonth() + 1}</text>`; });
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${grid}<path d="${area}" fill="url(#ag)"/><path d="${dPath}" fill="none" stroke="#d4af37" stroke-width="2.5"/>${xlab}<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity=".35"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient></defs></svg>`;
}

function svgGrouped(data, { w = 600, h = 260, pad = 40 } = {}) {
  // data: [{label, real, prev}]
  const max = Math.max(...data.flatMap(d => [d.real, d.prev]), 1);
  const n = data.length, gGap = 22, plotH = h - pad - 30, plotW = w - 20;
  const grpW = (plotW - gGap * (n - 1)) / n, bw = grpW / 2 - 3;
  let bars = '';
  data.forEach((d, i) => {
    const gx = 10 + i * (grpW + gGap);
    [['real', d.real, '#ef4444'], ['prev', d.prev, '#f59e0b']].forEach(([k, v, c], j) => {
      const bh = Math.max((v / max) * plotH, v > 0 ? 2 : 0);
      const x = gx + j * (bw + 6), y = pad + (plotH - bh);
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${c}"/>`;
      if (v > 0) bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" class="bs">${eur0(v)}</text>`;
    });
    bars += `<text x="${(gx + grpW / 2).toFixed(1)}" y="${(pad + plotH + 16).toFixed(1)}" text-anchor="middle" class="bx">${esc(d.label)}</text>`;
  });
  const leg = `<g><rect x="${w - 150}" y="6" width="11" height="11" rx="2" fill="#ef4444"/><text x="${w - 134}" y="15" class="bs">Real</text><rect x="${w - 90}" y="6" width="11" height="11" rx="2" fill="#f59e0b"/><text x="${w - 74}" y="15" class="bs">Previsto</text></g>`;
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${leg}${bars}</svg>`;
}

/* ──────────────── DATOS → GRÁFICOS ──────────────── */
const recByArr = CREW.map(n => ({ label: n, value: recBy[n].eur, color: CCOL[n], sub: recBy[n].n + ' pagos' })).sort((a, b) => b.value - a.value);
const advByArr = CREW.map(n => ({ label: n, value: advBy[n].eur, color: CCOL[n], sub: advBy[n].n ? advBy[n].n + ' g.' : '' })).sort((a, b) => b.value - a.value);
const realRamaArr = Object.keys(realRama).map(r => ({ label: RAMA_LABEL[r] || r, value: realRama[r], color: RAMA_COL[r] || '#94a3b8' })).sort((a, b) => b.value - a.value);
const allRamas = [...new Set([...Object.keys(realRama), ...Object.keys(prevRama)])];
const groupArr = allRamas.map(r => ({ label: RAMA_LABEL[r] || r, real: realRama[r] || 0, prev: prevRama[r] || 0 })).sort((a, b) => Math.max(b.real, b.prev) - Math.max(a.real, a.prev));
const dayArr = [
  { label: 'Finde completo', value: byDay.finde || 0, color: '#a78bfa' },
  { label: 'Solo viernes', value: byDay.viernes || 0, color: '#22d3ee' },
  { label: 'Solo sábado', value: byDay.sabado || 0, color: '#fb7185' }
];
const tStatusArr = [
  { label: 'Hechas', value: tSt.hecho || 0, color: '#10b981' },
  { label: 'En curso', value: tSt.en_curso || 0, color: '#f59e0b' },
  { label: 'Pendientes', value: tSt.pendiente || 0, color: '#ef4444' }
];

// Balance: barras divergentes (recaudado positivo, adelantado como referencia)
const balArr = CREW.map(n => ({ name: n, rec: recBy[n].eur, adv: advBy[n].eur, net: net[n] })).sort((a, b) => b.net - a.net);

/* ──────────────── HTML ──────────────── */
function kpi(label, value, sub, accent) {
  return `<div class="kpi"><div class="kpi-v" style="color:${accent || '#e7d5a8'}">${value}</div><div class="kpi-l">${label}</div>${sub ? `<div class="kpi-s">${sub}</div>` : ''}</div>`;
}

function insight(icon, title, body, tone) {
  return `<div class="insight ${tone || ''}"><div class="ins-h">${icon} ${title}</div><div class="ins-b">${body}</div></div>`;
}

const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Informe Retrospectivo · ${EDITION}</title>
<style>
:root{--bg:#0f1115;--card:#181b22;--card2:#1f232c;--bd:#2a2f3a;--tx:#e6e8ec;--tx2:#9aa3b2;--gold:#d4af37;--purple:#8b5cf6}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:920px;margin:0 auto;padding:32px 20px 80px}
.cover{text-align:center;padding:48px 0 36px;border-bottom:1px solid var(--bd);margin-bottom:36px}
.logo{font-size:13px;letter-spacing:3px;text-transform:uppercase;font-weight:700}
.logo .o{color:var(--gold)}.logo .s{color:var(--purple)}
h1{font-size:34px;margin:14px 0 6px;letter-spacing:-.5px}
.cover .sub{color:var(--tx2);font-size:14px}
.cover .meta{margin-top:14px;font-size:12px;color:var(--tx2)}
.cover .meta b{color:var(--tx)}
h2{font-size:21px;margin:46px 0 6px;display:flex;align-items:center;gap:10px}
h2 .em{font-size:24px}
.sec-int{color:var(--tx2);font-size:13px;margin:0 0 18px;border-left:3px solid var(--purple);padding-left:12px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:18px 0}
.kpi{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px 14px}
.kpi-v{font-size:25px;font-weight:800;letter-spacing:-.5px}
.kpi-l{font-size:12px;color:var(--tx2);margin-top:2px}
.kpi-s{font-size:11px;color:var(--tx2);margin-top:4px;opacity:.8}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px 18px 14px;margin:16px 0}
.card h3{margin:0 0 4px;font-size:15px}
.card .cap{font-size:12px;color:var(--tx2);margin:0 0 12px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:680px){.grid2{grid-template-columns:1fr}}
.chart{width:100%;height:auto;display:block}
.bl{fill:var(--tx);font-size:12px}.bx{fill:var(--tx);font-size:12px}.bs{fill:var(--tx2);font-size:10.5px}
.grid{stroke:rgba(255,255,255,.06);stroke-width:1}
.donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.donut{width:200px;flex:0 0 auto}
.dn-c{fill:var(--tx);font-size:18px;font-weight:800}.dn-s{fill:var(--tx2);font-size:10px}
.legend{flex:1;min-width:170px;display:flex;flex-direction:column;gap:6px}
.leg{font-size:12.5px;color:var(--tx2)}.leg b{color:var(--tx)}
.dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:middle}
.insight{background:var(--card2);border:1px solid var(--bd);border-left-width:4px;border-radius:10px;padding:13px 15px;margin:12px 0}
.insight.good{border-left-color:#10b981}.insight.warn{border-left-color:#f59e0b}.insight.bad{border-left-color:#ef4444}.insight.info{border-left-color:var(--purple)}
.ins-h{font-weight:700;font-size:14px;margin-bottom:3px}
.ins-b{font-size:13px;color:var(--tx2)}.ins-b b{color:var(--tx)}
.bal-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd);font-size:13px}
.bal-row:last-child{border:0}
.bal-name{width:84px;font-weight:600}
.bal-bars{flex:1;display:flex;flex-direction:column;gap:3px}
.bal-seg{height:9px;border-radius:3px}
.bal-net{width:130px;text-align:right;font-weight:700;font-size:12.5px}
.cols2{columns:2;gap:24px}@media(max-width:680px){.cols2{columns:1}}
.cols2 li{break-inside:avoid;margin-bottom:6px;font-size:13px}
ul.tight{margin:6px 0;padding-left:20px}
.retro{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:680px){.retro{grid-template-columns:1fr}}
.retro .card{margin:0}
.tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(139,92,246,.18);color:#c4b5fd;margin-left:6px}
.foot{margin-top:50px;padding-top:18px;border-top:1px solid var(--bd);text-align:center;font-size:11px;color:var(--tx2)}
@media print{body{background:#fff;color:#111}.card,.kpi,.insight{break-inside:avoid}}
</style></head>
<body><div class="wrap">

<div class="cover">
  <div class="logo"><span class="o">Orgía</span> <span class="s">Sonora</span></div>
  <h1>${EDITION}</h1>
  <div class="sub">Informe retrospectivo de la edición</div>
  <div class="meta">Evento: <b>${EVENT_DATE}</b> &nbsp;·&nbsp; Informe generado el <b>${GEN_DATE}</b> &nbsp;·&nbsp; <b>${CREW.length}</b> organizadores</div>
</div>

<div class="kpis">
  ${kpi('Recaudado', eur0(recaudado), entradas + ' entradas · ' + eur(ticketMedio) + '/ud', '#34d399')}
  ${kpi('Gasto real', eur0(gReal), reales.length + ' gastos registrados', '#f87171')}
  ${kpi('Previsión pendiente', eur0(gPrev), 'sin convertir a real', '#fbbf24')}
  ${kpi('Bote generado', eur0(bote), SET.botePct + '% para futuras ediciones', '#c4b5fd')}
  ${kpi('Presupuesto', eur0(SET.presupuesto), eur0(dispReal) + ' sin gastar (real)', '#60a5fa')}
  ${kpi('Cash org repartido', eur0(sumNet), 'en manos del equipo, sin saldar', '#e7d5a8')}
</div>

${insight('⚠️', 'Las cuentas todavía no se pueden cerrar', `El gasto más grande de la fiesta — el <b>alquiler del local (${eur0(prevRama.local || 2392)})</b> — sigue como <b>previsión</b>, nunca se registró como gasto real. Por eso "Saldar cuentas" no propone transferencias: hoy <b>los 7 figuran con dinero de la organización en sus manos</b> (${eur0(sumNet)} en total) y nadie aparece como acreedor. En cuanto se registre quién pagó el alquiler, esa persona pasará a ser la gran acreedora y se desencadenará el reparto.`, 'bad')}

<h2><span class="em">💶</span> Dinero: entradas y recaudación</h2>
<p class="sec-int">120 entradas vendidas por 5.810,50 €. Esto es cuándo entró el dinero y por las manos de quién.</p>

<div class="card">
  <h3>Recaudación acumulada en el tiempo</h3>
  <p class="cap">De la primera venta (9 abril) a la última (28 mayo). La pendiente revela el ritmo de venta.</p>
  ${svgLine(cum)}
</div>

<div class="insight info"><div class="ins-h">📈 Las ventas se dispararon en el último mes</div><div class="ins-b">En <b>abril</b> se vendieron <b>${byMonth['2026-04'].t} entradas</b> (${eur0(byMonth['2026-04'].eur)}). En <b>mayo</b>, el sprint final: <b>${byMonth['2026-05'].t} entradas</b> (${eur0(byMonth['2026-05'].eur)}) — el <b>${(byMonth['2026-05'].t / entradas * 100).toFixed(0)}% de todas las entradas</b> en las semanas previas al evento.</div></div>

<div class="grid2">
  <div class="card"><h3>Quién cobró las entradas</h3><p class="cap">Reparto de la recaudación por organizador</p>${svgBarsH(recByArr, { fmt: eur0 })}</div>
  <div class="card"><h3>Tipo de entrada vendida</h3><p class="cap">Pases de finde vs. días sueltos</p>${svgDonut(dayArr, { fmt: n => n + ' ent.' })}</div>
</div>

<div class="insight warn"><div class="ins-h">⚖️ El cobro recayó en pocas manos</div><div class="ins-b"><b>Magdalena (${eur0(recBy.Magdalena.eur)}, ${recBy.Magdalena.n} pagos)</b> y <b>Gurke (${eur0(recBy.Gurke.eur)}, ${recBy.Gurke.n} pagos)</b> gestionaron el <b>${((recBy.Magdalena.eur + recBy.Gurke.eur) / recaudado * 100).toFixed(0)}% de toda la recaudación</b> entre los dos. En el otro extremo, Dsastre (${eur0(recBy.Dsastre.eur)}) y Panda (${eur0(recBy.Panda.eur)}) apenas cobraron. Algo a equilibrar en la XII.</div></div>

<h2><span class="em">🧾</span> Dinero: gastos y presupuesto</h2>
<p class="sec-int">2.798,67 € gastados de 6.000 € de presupuesto. Dónde fue el dinero y cómo de finas estuvieron las previsiones.</p>

<div class="grid2">
  <div class="card"><h3>Gasto real por rama</h3><p class="cap">Reparto de los ${eur0(gReal)} ya gastados</p>${svgDonut(realRamaArr)}</div>
  <div class="card"><h3>Previsto vs. real por rama</h3><p class="cap">Dónde acertamos el presupuesto y dónde no</p>${svgGrouped(groupArr)}</div>
</div>

${insight('🎯', 'Previsiones: bien en comida, pendiente el local', `La <b>comida y bebida</b> se presupuestó en ${eur0(prevRama.desmontaje || 1200)} y se gastaron <b>${eur0(realRama.desmontaje || 0)}</b> — un acierto, <b>por debajo de lo previsto</b>. El <b>sonido</b> clavó la previsión (${eur0(prevRama.sonido || 0)} previsto ≈ ${eur0(realRama.sonido || 0)} real). El gran pendiente sigue siendo el <b>alquiler del local (${eur0(prevRama.local || 0)})</b>, aún sin registrar.`, 'good')}

<h2><span class="em">👥</span> Equipo: quién puso el dinero</h2>
<p class="sec-int">Más allá de cobrar, alguien adelanta de su bolsillo. Aquí se ve el esfuerzo económico real.</p>

<div class="card"><h3>Dinero adelantado por persona</h3><p class="cap">Gastos reales pagados de su propio bolsillo</p>${svgBarsH(advByArr, { fmt: eur0 })}</div>

<div class="insight bad"><div class="ins-h">💳 Magdalena cargó con casi todo el desembolso</div><div class="ins-b"><b>Magdalena adelantó ${eur0(advBy.Magdalena.eur)}</b> — el <b>${(advBy.Magdalena.eur / gReal * 100).toFixed(0)}% de todo el gasto real</b> de la fiesta. Le siguen Francis (${eur0(advBy.Francis.eur)}) y Gurke (${eur0(advBy.Gurke.eur)}). <b>Panda, Dsastre y Cizette no adelantaron nada.</b> Es justo que se le devuelva cuanto antes — y un aviso para repartir mejor los pagos grandes la próxima vez.</div></div>

<div class="card"><h3>Balance por persona: recaudado vs. adelantado</h3><p class="cap">Verde = dinero de la org que tiene en mano · Morado = adelantado de su bolsillo · A la derecha, el neto</p>
${balArr.map(b => {
  const maxV = Math.max(...balArr.map(x => Math.max(x.rec, x.adv)), 1);
  return `<div class="bal-row"><div class="bal-name">${b.name}</div><div class="bal-bars">
    <div class="bal-seg" style="width:${(b.rec / maxV * 100).toFixed(1)}%;background:#34d399" title="Recaudado"></div>
    <div class="bal-seg" style="width:${(b.adv / maxV * 100).toFixed(1)}%;background:#a78bfa" title="Adelantado"></div>
  </div><div class="bal-net" style="color:${b.net > 0 ? '#34d399' : '#f87171'}">${b.net >= 0 ? 'tiene ' : 'le deben '}${eur0(Math.abs(b.net))}</div></div>`;
}).join('')}
</div>

<h2><span class="em">✅</span> Equipo: trabajo y decisiones</h2>
<p class="sec-int">${T.length} tareas y ${DE.length} decisiones registradas. Qué se cerró y qué quedó colgando.</p>

<div class="grid2">
  <div class="card"><h3>Estado de las tareas</h3><p class="cap">${tSt.hecho || 0} de ${T.length} completadas</p>${svgDonut(tStatusArr, { fmt: n => n + '' })}</div>
  <div class="card"><h3>Decisiones tomadas</h3><p class="cap">${dSt.aprobada || 0} aprobadas, ${dSt.en_debate || 0} en debate</p>
    ${svgBarsV([{ label: 'Aprobadas', value: dSt.aprobada || 0, color: '#10b981' }, { label: 'En debate', value: dSt.en_debate || 0, color: '#f59e0b' }, { label: 'Descartadas', value: dSt.descartada || 0, color: '#ef4444' }], { fmt: n => n + '', h: 200 })}
  </div>
</div>

<div class="insight info"><div class="ins-h">🧩 Lo que quedó pendiente eran cabos sueltos, no críticos</div><div class="ins-b">De las <b>${tPend.length} tareas sin cerrar</b>, casi todas son temas blandos o aplazables: ${tPend.map(t => esc(t.title)).slice(0, 4).join(', ')}… Ninguna era bloqueante para la fiesta. Buena señal: <b>lo importante se ejecutó</b>.</div></div>

<h2><span class="em">🎧</span> Lineup</h2>
<p class="sec-int">La herramienta de propuestas colaborativas de lineup, una de las más trabajadas de la app.</p>

<div class="kpis">
  ${kpi('DJs en el pool', d.lineup_djs.length, 'añadidos entre todos')}
  ${kpi('Propuestas creadas', d.lineup_proposals.length, 'de ' + CREW.length + ' posibles')}
  ${kpi('Encuestas', d.polls.length, 'votaciones lanzadas')}
</div>

<div class="insight warn"><div class="ins-h">🎚️ La función de lineup colaborativo apenas se usó</div><div class="ins-b">Se llenó un pool de <b>${d.lineup_djs.length} DJs</b>, pero solo se crearon <b>${d.lineup_proposals.length} propuestas, ambas de Francis</b>, y <b>cero encuestas</b>. Una de las partes más currradas de la herramienta acabó llevándose en solitario. Para la XII: o se anima al equipo a proponer, o se simplifica.</div></div>

<h2><span class="em">🔎</span> Retrospectiva: qué nos llevamos</h2>
<p class="sec-int">El resumen para debatir en equipo.</p>

<div class="retro">
  <div class="card"><h3 style="color:#34d399">✅ Lo que fue bien</h3><ul class="tight">
    <li>Se vendieron <b>${entradas} entradas</b> y se recaudaron <b>${eur0(recaudado)}</b>.</li>
    <li>La <b>comida y bebida</b> salió por debajo de presupuesto (${eur0(realRama.desmontaje || 0)} vs ${eur0(prevRama.desmontaje || 0)} previsto).</li>
    <li><b>${dSt.aprobada || 0} de ${DE.length} decisiones</b> cerradas y <b>lo crítico ejecutado</b>: ninguna tarea pendiente era bloqueante.</li>
    <li>Se generó un <b>bote de ${eur0(bote)}</b> para arrancar la próxima edición.</li>
  </ul></div>
  <div class="card"><h3 style="color:#f87171">⚠️ A mejorar en la XII</h3><ul class="tight">
    <li><b>Registrar los gastos en el momento</b>: falta el alquiler (${eur0(prevRama.local || 0)}), lo que impide cerrar cuentas.</li>
    <li><b>Repartir los pagos grandes</b>: Magdalena adelantó el ${(advBy.Magdalena.eur / gReal * 100).toFixed(0)}% sola.</li>
    <li><b>Equilibrar el cobro</b>: dos personas movieron el ${((recBy.Magdalena.eur + recBy.Gurke.eur) / recaudado * 100).toFixed(0)}% de la recaudación.</li>
    <li><b>Usar el lineup colaborativo</b> entre todos, o simplificarlo.</li>
  </ul></div>
</div>

<div class="card" style="border-color:var(--purple)"><h3>🚀 Acciones concretas antes de archivar esta edición</h3><ul class="tight">
  <li>Apuntar el <b>alquiler del local</b> y cualquier gasto que falte como gasto <b>real</b>, con quién lo pagó.</li>
  <li>Ir a <b>Saldar cuentas</b> y ejecutar las transferencias mínimas que proponga (devolver primero a Magdalena y Francis).</li>
  <li>Confirmar el <b>bote final</b> que pasa a San Sonorín XII.</li>
  <li>Una vez cuadrado todo: <b>archivar San Sonorín XI</b> y abrir la nueva edición.</li>
</ul></div>

<div class="foot">Orgía Sonora · Informe generado automáticamente desde el backup de la edición · ${GEN_DATE}<br>Datos: ${P.length} pagos · ${d.expenses.length} gastos · ${T.length} tareas · ${DE.length} decisiones · ${d.lineup_djs.length} DJs</div>

</div></body></html>`;

const OUT = 'informe-retrospectivo-san-sonorin-xi.html';
fs.writeFileSync(OUT, html, 'utf8');
console.log('OK ->', OUT, '(' + (html.length / 1024).toFixed(1) + ' KB)');
