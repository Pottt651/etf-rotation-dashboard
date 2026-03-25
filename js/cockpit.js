// Tab1: 实盘驾驶舱

function initCockpit() {
  const d = window.COCKPIT_DATA;
  if (!d) return;

  renderSignalCard(d);
  renderKPI(d.kpi);
  renderRV(d);
  renderNavChart(d);
  renderDrawdownChart(d);
  renderTrades(d.recent_trades);
  renderLiveTrades();
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
    const r = a.r_15d != null ? a.r_15d : a.r_20d;   // 兼容旧字段名
    const vol = a.vol_15d != null ? a.vol_15d : a.vol_20d;
    const rStr = r != null ? fmt(r) : '--';
    const rCls = r != null ? colorClass(r) : '';
    const volStr = vol != null ? (vol * 100).toFixed(1) + '%' : '--';
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

function renderDrawdownChart(d) {
  const nav = d.nav;
  const vals = nav.values;
  const dates = nav.dates;
  const dd = [];
  let maxNav = vals[0];
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] > maxNav) maxNav = vals[i];
    dd.push(vals[i] / maxNav - 1);
  }
  drawdownChart('drawdown-chart', dates, dd);
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

function renderLiveTrades() {
  const container = document.getElementById('live-trades-section');
  if (!container) return;
  const data = window.LIVE_TRADES_DATA;
  if (!data || !data.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px">暂无实盘交易记录</div>';
    return;
  }
  const reversed = [...data].reverse();
  const rows = reversed.map(t => `
    <tr>
      <td style="color:var(--text-dim)">${t.date}</td>
      <td>${t.action}</td>
      <td>${t.from_asset}<span style="color:var(--text-dim);font-size:11px"> (${t.from_code})</span></td>
      <td style="color:var(--accent)">→</td>
      <td>${t.to_asset}<span style="color:var(--text-dim);font-size:11px"> (${t.to_code})</span></td>
      <td style="color:var(--text-dim);font-size:12px">${t.price_bought || '--'}</td>
      <td style="color:var(--text-dim);font-size:12px">${t.note || ''}</td>
    </tr>
  `).join('');
  container.innerHTML = `
    <table class="rv-table" style="font-size:13px">
      <thead>
        <tr>
          <th style="text-align:left">日期</th>
          <th style="text-align:left">操作</th>
          <th style="text-align:left">卖出</th>
          <th></th>
          <th style="text-align:left">买入</th>
          <th style="text-align:right">买入价</th>
          <th style="text-align:left">备注</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPositionBand(d) {
  // Bug 1 fix: 直接使用 position_series 而不是从 recent_trades 重建
  const posSeries = d.position_series;
  const nav = d.nav;
  const POS_COLORS = {
    // v3 池
    '512800': '#e6b800', '513500': '#448aff',
    '515030': '#00c853', '515880': '#ab47bc', '131810': '#8892a4',
    // v2 旧池（历史色带兼容）
    '512890': '#ff9800', '513100': '#22aaff',
  };

  // POS_MAP: key -> code（兼容 v2 旧键名）
  const KEY_TO_CODE = {
    // v3 新键名
    'bank': '512800', 'sp500': '513500',
    'nev': '515030', 'telecom': '515880',
    'repo': '131810', 'repo131810': '131810',
    // v2 旧键名（历史数据兼容）
    'dividend_lowvol': '512890', 'nasdaq': '513100',
  };

  if (!posSeries || !posSeries.dates || !posSeries.dates.length) return;

  // 构建 positionSeries date → code 映射
  const posMap = {};
  for (let i = 0; i < posSeries.dates.length; i++) {
    const key = posSeries.values[i];
    const code = KEY_TO_CODE[key] || key;
    posMap[posSeries.dates[i]] = code;
  }

  // 对 nav.dates 中的每个日期，前向填充 position
  const allDates = nav.dates;
  let curPos = '131810';
  const positions = [];
  // 先找 posSeries 开始时的初始持仓
  if (posSeries.dates.length > 0) {
    curPos = KEY_TO_CODE[posSeries.values[0]] || posSeries.values[0];
  }

  // 重建从最早日期开始的持仓序列
  // 用 posSeries 构建完整日期→持仓映射（前向填充逻辑：nav日期排列）
  let posIdx = 0;
  const posDates = posSeries.dates;
  const posVals = posSeries.values;

  for (const dt of allDates) {
    // 推进 posIdx 直到 posDates[posIdx] <= dt
    while (posIdx < posDates.length && posDates[posIdx] <= dt) {
      curPos = KEY_TO_CODE[posVals[posIdx]] || posVals[posIdx];
      posIdx++;
    }
    positions.push(curPos);
  }

  const container = document.getElementById('position-band');
  if (!container) return;
  const w = container.clientWidth || 800;
  const n = positions.length;

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
  const legend = [['512800','#e6b800','银行'], ['513500','#448aff','标普500'],
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
