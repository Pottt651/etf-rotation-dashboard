// Tab1: 实盘驾驶舱

function initCockpit() {
  const d = window.COCKPIT_DATA;
  if (!d) return;

  renderSignalCard(d);
  renderKPI(d.kpi);
  renderRV(d);
  renderNavChart(d);
  renderTrades(d.recent_trades);
  renderPositionBand(d);
  renderAnnualBar(d.annual_returns);
}

function fmt(v, isPercent = true) {
  if (v == null) return '--';
  const n = isPercent ? v * 100 : v;
  const s = (n >= 0 ? '+' : '') + n.toFixed(1) + (isPercent ? '%' : '');
  return s;
}

function colorClass(v) {
  if (v == null) return '';
  return v >= 0 ? 'positive' : 'negative';
}

function renderSignalCard(d) {
  const sig = d.current_signal;
  const el = document.getElementById('signal-card');
  const isRepo = sig.holding === '131810';
  el.innerHTML = `
    <div class="card-title">当前持仓信号</div>
    <div class="holding-code" style="color:${isRepo ? '#8892a4' : '#e6b800'}">${sig.holding}</div>
    <div class="holding-name">${sig.holding_name}</div>
    <div class="holding-meta">
      持有第 <b>${sig.days_held}</b> 天 &nbsp;·&nbsp; 信号日期: ${sig.signal_date}
    </div>
  `;
}

function renderKPI(kpi) {
  const items = [
    { label: '本年收益', value: fmt(kpi.ytd_return), cls: colorClass(kpi.ytd_return) },
    { label: '策略年化', value: fmt(kpi.cagr), cls: colorClass(kpi.cagr) },
    { label: '夏普比率', value: kpi.sharpe.toFixed(2), cls: '' },
    { label: '最大回撤', value: fmt(kpi.max_drawdown), cls: colorClass(kpi.max_drawdown) },
    { label: '总收益', value: fmt(kpi.total_return), cls: colorClass(kpi.total_return) },
    { label: '年换手次数', value: kpi.switches_per_year.toFixed(1) + '次', cls: '' },
  ];
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = items.map(it => `
    <div class="kpi-item">
      <div class="kpi-label">${it.label}</div>
      <div class="kpi-value ${it.cls}">${it.value}</div>
    </div>
  `).join('');
}

function renderRV(d) {
  const sig = d.current_signal;
  const assets = d.asset_rv;
  const holding_code = sig.holding;

  const tbody = assets.map(a => {
    const isWinner = a.code === holding_code;
    const rStr = a.r_20d != null ? fmt(a.r_20d) : '--';
    const rCls = a.r_20d != null ? colorClass(a.r_20d) : '';
    const volStr = a.vol_20d != null ? (a.vol_20d * 100).toFixed(1) + '%' : '--';
    const rvStr = a.rv != null ? a.rv.toFixed(3) : (a.eligible ? '--' : '×');
    const tag = isWinner
      ? '<span class="tag tag-hold">持有</span>'
      : (!a.eligible ? '<span class="tag tag-neg">不参与</span>' : '');
    return `
      <tr class="${isWinner ? 'winner' : ''}">
        <td>${a.code} <span style="color:var(--text-dim);font-size:12px">${a.name}</span></td>
        <td class="${rCls}">${rStr}</td>
        <td style="color:var(--text-dim)">${volStr}</td>
        <td style="color:${isWinner ? 'var(--accent)' : 'inherit'};font-weight:${isWinner?700:400}">${rvStr}</td>
        <td>${tag}</td>
      </tr>`;
  }).join('');

  document.getElementById('rv-table-body').innerHTML = tbody;
}

function renderNavChart(d) {
  const nav = d.nav;
  // 归一化到起始1.0（已是净值，直接用）
  navChart('nav-chart', [
    { name: '主策略', dates: nav.dates, values: nav.values, color: '#e6b800', width: 2 },
  ]);
}

function renderTrades(trades) {
  const list = document.getElementById('trade-list');
  // 倒序展示最近交易
  const reversed = [...trades].reverse();
  list.innerHTML = reversed.map(t => `
    <li>
      <span class="trade-date">${t.date}</span>
      <span>${t.from_name}(${t.from})</span>
      <span class="trade-arrow">→</span>
      <span style="color:var(--accent)">${t.to_name}(${t.to})</span>
    </li>
  `).join('');
}

function renderPositionBand(d) {
  // 从 nav 日期 + 切仓记录重建持仓色带
  const trades = d.recent_trades;
  const nav = d.nav;
  const POS_COLORS = {
    '512890': '#ff9800', '513100': '#448aff',
    '515030': '#00c853', '515880': '#ab47bc', '131810': '#8892a4',
  };
  // 用切仓记录推断每日持仓
  if (!trades || !trades.length) return;
  const allDates = nav.dates;
  const tradeMap = {};
  for (const t of trades) tradeMap[t.date] = t.to;

  let curPos = trades[0].from;
  const positions = [];
  for (const d of allDates) {
    if (tradeMap[d]) curPos = tradeMap[d];
    positions.push(curPos);
  }

  const container = document.getElementById('position-band');
  if (!container) return;
  const w = container.clientWidth || 800;
  const n = positions.length;
  const segW = Math.max(1, w / n);

  // 用 canvas 绘制
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = 60;
  canvas.style.width = '100%'; canvas.style.height = '60px';
  const ctx = canvas.getContext('2d');
  positions.forEach((p, i) => {
    ctx.fillStyle = POS_COLORS[p] || '#666';
    ctx.fillRect(Math.floor(i * w / n), 0, Math.ceil(w / n) + 1, 60);
  });
  // 图例
  ctx.font = '11px sans-serif';
  const legend = [['512890','#ff9800','红利低波'], ['513100','#448aff','纳指'],
                  ['515030','#00c853','新能源车'], ['515880','#ab47bc','通信'],
                  ['131810','#8892a4','逆回购']];
  let lx = 8;
  for (const [code, color, name] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, 4, 10, 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, lx + 14, 14);
    lx += ctx.measureText(name).width + 30;
  }

  container.innerHTML = '';
  container.appendChild(canvas);
}

function renderAnnualBar(annual) {
  annualBarChart('annual-bar-chart', annual);
}
