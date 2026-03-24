// Tab1: 实盘驾驶舱

function initCockpit() {
  const d = window.COCKPIT_DATA;
  if (!d) return;

  renderSignalCard(d);
  renderKPI(d.kpi);
  renderRV(d);
  renderNavChart(d);
  renderTrades(d.recent_trades);
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
    const tag = isWinner
      ? '<span class="tag tag-hold">持有</span>'
      : (!a.eligible ? '<span class="tag tag-neg">不参与</span>' : '');
    return `
      <tr class="${isWinner ? 'winner' : ''}">
        <td>${a.code} <span style="color:var(--text-dim);font-size:12px">${a.name}</span></td>
        <td class="${rCls}">${rStr}</td>
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

function renderAnnualBar(annual) {
  annualBarChart('annual-bar-chart', annual);
}
