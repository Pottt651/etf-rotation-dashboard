// Tab1: 实盘驾驶舱

function initCockpit() {
  const d = window.COCKPIT_DATA;
  if (!d) return;

  renderSignalCard(d);
  renderKPI(d.kpi);
  renderRV(d);
  renderNavChart(d);
  renderDrawdownChart(d);
  renderTrades(d.recent_trades || []);
  renderLiveTrades();
  renderPositionBand(d);
  renderAnnualBar(d.annual_returns || d.annual || []);
  renderStrategyDetail(d);
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
  // Support both new format (code/name/date) and old format (holding/holding_name/days_held/signal_date)
  const code = sig.code || sig.holding || '--';
  const name = sig.name || sig.holding_name || code;
  const date = sig.date || sig.signal_date || '--';
  const isRepo = code.includes('131810');
  const metaHtml = sig.days_held != null
    ? `持有第 <b>${sig.days_held}</b> 天 &nbsp;·&nbsp; 信号日期: ${date}`
    : `信号日期: ${date}`;
  el.innerHTML = `
    <div class="card-title">当前持仓信号</div>
    <div class="holding-code" style="color:${isRepo ? '#8892a4' : '#e6b800'}">${code}</div>
    <div class="holding-name">${name}</div>
    <div class="holding-meta">${metaHtml}</div>
  `;
}

function renderKPI(kpi) {
  // Support both new format (ytd_ret as percent, cagr as percent) and old format (fractions)
  const ytdRet  = kpi.ytd_ret  != null ? kpi.ytd_ret / 100  : kpi.ytd_return;
  const cagrVal = kpi.cagr     != null ? (Math.abs(kpi.cagr) > 1 ? kpi.cagr / 100 : kpi.cagr) : null;
  const mddVal  = kpi.mdd      != null ? (Math.abs(kpi.mdd)  > 1 ? kpi.mdd  / 100 : kpi.mdd)  : kpi.max_drawdown;
  const sharpe  = kpi.sharpe   != null ? kpi.sharpe : null;
  const totalRet = kpi.total_return != null ? kpi.total_return : null;
  const switchesYr = kpi.switches_per_year != null ? kpi.switches_per_year : null;
  const years   = kpi.years != null ? kpi.years : null;

  const items = [
    { label: '本年收益', value: ytdRet != null ? fmt(ytdRet) : '--', cls: ytdRet != null ? colorClass(ytdRet) : '' },
    { label: '策略年化', value: cagrVal != null ? fmt(cagrVal) : '--', cls: cagrVal != null ? colorClass(cagrVal) : '' },
    { label: '夏普比率', value: sharpe != null ? sharpe.toFixed(2) : '--', cls: '' },
    { label: '最大回撤', value: mddVal != null ? fmt(mddVal) : '--', cls: mddVal != null ? colorClass(mddVal) : '' },
    { label: totalRet != null ? '总收益' : '回测年限', value: totalRet != null ? fmt(totalRet) : (years != null ? years + ' 年' : '--'), cls: totalRet != null ? colorClass(totalRet) : '' },
    { label: '年换手次数', value: switchesYr != null ? switchesYr.toFixed(1) + '次' : '--', cls: '' },
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
  // Support both old asset_rv field and new rv_table field
  const assets = d.rv_table || d.asset_rv;
  const holding_code = (sig.code || sig.holding);

  // Update card title dynamically using params if available
  const titleEl = document.getElementById('rv-card-title');
  if (titleEl && d.params) {
    const lb = d.params.lb || d.params.lookback || '?';
    const mode = d.params.mode || 'rv';
    titleEl.textContent = `资产 ${lb}日 R/V 状态（${d.strategy_name || '当前策略'}）`;
  }

  const tbody = assets.map(a => {
    const isWinner = (a.selected != null) ? a.selected : (a.code === holding_code);
    // Support both new rv_table format (r in %, score) and old asset_rv format (r_15d as fraction)
    let rVal, volStr, rvStr;
    if (a.r != null) {
      // New format: r is already in percent
      rVal = a.r / 100;
      volStr = a.v != null ? a.v.toFixed(1) + '%' : '--';
      rvStr = a.score != null ? a.score.toFixed(3) : '--';
    } else {
      // Old format
      const r_raw = a.r_15d != null ? a.r_15d : a.r_20d;
      const vol_raw = a.vol_15d != null ? a.vol_15d : a.vol_20d;
      rVal = r_raw;
      volStr = vol_raw != null ? (vol_raw * 100).toFixed(1) + '%' : '--';
      rvStr = a.rv != null ? a.rv.toFixed(3) : (a.eligible ? '--' : '×');
    }
    const rStr = rVal != null ? fmt(rVal) : '--';
    const rCls = rVal != null ? colorClass(rVal) : '';
    const eligible = a.eligible != null ? a.eligible : (a.score != null);
    const tag = isWinner
      ? '<span class="tag tag-hold">持有</span>'
      : (!eligible ? '<span class="tag tag-neg">不参与</span>' : '');
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
  // Support both new nav_1y format and old nav format
  const nav = d.nav_1y || d.nav;
  if (!nav || !nav.dates || !nav.dates.length) return;
  // 归一化到起始1.0（已是净值，直接用）
  navChart('nav-chart', [
    { name: '主策略', dates: nav.dates, values: nav.values, color: '#e6b800', width: 2 },
  ]);
}

function renderDrawdownChart(d) {
  const nav = d.nav_1y || d.nav;
  if (!nav || !nav.dates || !nav.dates.length) return;
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
  if (!trades || !trades.length) {
    list.innerHTML = '<li style="color:var(--text-dim);font-size:13px">暂无切仓记录</li>';
    return;
  }
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
  const posSeries = d.position_series;
  if (!posSeries || !posSeries.dates || !posSeries.dates.length) return;

  // 动态生成颜色 — 从 rv_table 资产派生
  const PALETTE = ['#e6b800', '#4e9af1', '#00c853', '#ab47bc', '#ff9800', '#22c0c0'];
  const codeToColor = {'131810.SZ': '#8892a4'};
  const codeToName  = {'131810.SZ': '逆回购'};
  (d.rv_table || []).forEach((a, i) => {
    codeToColor[a.code] = PALETTE[i % PALETTE.length];
    codeToName[a.code]  = a.name;
  });

  // 只显示 nav_1y 的时间范围
  const nav = d.nav_1y || d.nav;
  let displayDates = posSeries.dates;
  let displayVals  = posSeries.values;
  if (nav && nav.dates && nav.dates.length > 0) {
    const startD   = nav.dates[0];
    const startIdx = posSeries.dates.findIndex(dt => dt >= startD);
    if (startIdx >= 0) {
      displayDates = posSeries.dates.slice(startIdx);
      displayVals  = posSeries.values.slice(startIdx);
    }
  }

  const container = document.getElementById('position-band');
  if (!container) return;
  const w = container.clientWidth || 800;
  const n = displayVals.length;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = 60;
  canvas.style.width = '100%'; canvas.style.height = '60px';
  const ctx = canvas.getContext('2d');

  displayVals.forEach((code, i) => {
    ctx.fillStyle = codeToColor[code] || '#555';
    ctx.fillRect(Math.floor(i * w / n), 0, Math.ceil(w / n) + 1, 60);
  });

  // 图例
  ctx.font = '11px sans-serif';
  const legendCodes = (d.rv_table || []).map(a => a.code).concat(['131810.SZ']);
  let lx = 8;
  for (const code of legendCodes) {
    const color = codeToColor[code] || '#555';
    const name  = codeToName[code]  || code;
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
  // Support both object format {2016: 12.3, ...} and array format [{year, return}, ...]
  if (annual && !Array.isArray(annual) && typeof annual === 'object') {
    const arr = Object.entries(annual).map(([yr, ret]) => ({ year: parseInt(yr), return: ret / 100 }));
    arr.sort((a, b) => a.year - b.year);
    annualBarChart('annual-bar-chart', arr);
  } else {
    annualBarChart('annual-bar-chart', annual);
  }
}

function renderStrategyDetail(d) {
  const el = document.getElementById('strategy-detail-body');
  if (!el) return;

  const assets  = d.rv_table || [];
  const params  = d.params   || {};
  const kpi     = d.kpi      || {};
  const kpiH    = d.kpi_holdout || {};

  const PALETTE = ['#e6b800', '#4e9af1', '#00c853', '#ab47bc', '#ff9800', '#22c0c0'];
  const lb  = params.lb  != null ? params.lb  : '?';
  const rw  = params.rw  != null ? (params.rw * 100).toFixed(0) : '100';
  const cd  = params.cd  != null ? params.cd  : '?';
  const mode = params.mode || 'rv';

  // 标的池
  const poolHtml = assets.map((a, i) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
        border-radius:6px;background:var(--bg-hover);border-left:3px solid ${PALETTE[i % PALETTE.length]}">
      <span style="font-size:16px;font-weight:700;color:${PALETTE[i % PALETTE.length]}">${a.code}</span>
      <div>
        <div style="font-weight:600;font-size:13px">${a.name}</div>
        <div style="font-size:11px;color:var(--text-dim)">风险资产</div>
      </div>
    </div>`
  ).join('') + `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
        border-radius:6px;background:var(--bg-hover);border-left:3px solid #8892a4">
      <span style="font-size:16px;font-weight:700;color:#8892a4">131810.SZ</span>
      <div>
        <div style="font-weight:600;font-size:13px">逆回购</div>
        <div style="font-size:11px;color:var(--text-dim)">防守资产（现金等价）</div>
      </div>
    </div>`;

  // 参数表
  const paramRows = [
    ['回看窗口 lookback', `${lb} 天`,  '计算动量和波动率的天数'],
    ['评分模式 mode',     mode === 'rv' ? 'R/V（风险调整动量）' : 'R（纯收益动量）', ''],
    ['风险仓位 risk_weight', `${rw}%`, `持风险资产比例，其余持逆回购`],
    ['冷却期 cooldown',   `${cd} 天`,  '换仓后强制持有的最短天数'],
  ];
  const paramHtml = paramRows.map(([name, val, desc]) =>
    `<tr>
      <td style="padding:6px 12px;font-size:13px;color:var(--text-dim)">${name}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;color:var(--accent);text-align:center">${val}</td>
      <td style="padding:6px 12px;font-size:12px;color:var(--text-dim)">${desc}</td>
    </tr>`
  ).join('');

  // 验证指标
  const fmtP = v => (v != null ? (v >= 0 ? '+' : '') + v + '%' : '--');
  const fmtN = v => v != null ? v : '--';
  const kpiRows = [
    ['全期（2015~今）',   fmtP(kpi.cagr),   fmtN(kpi.sharpe),  fmtP(kpi.mdd)],
    ['严格样本外（2024~今）', fmtP(kpiH.cagr), fmtN(kpiH.sharpe), fmtP(kpiH.mdd)],
  ];
  const kpiHtml = kpiRows.map(([label, cagr, sharpe, dd]) =>
    `<tr>
      <td style="padding:6px 12px;font-size:13px;color:var(--text-dim)">${label}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;color:var(--green);text-align:center">${cagr}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;text-align:center">${sharpe}</td>
      <td style="padding:6px 12px;font-size:13px;color:var(--red);text-align:center">${dd}</td>
    </tr>`
  ).join('');

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">标的池</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">${poolHtml}</div>

        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">信号逻辑</div>
        <div style="font-size:13px;line-height:1.8;background:var(--bg-hover);padding:14px 16px;border-radius:6px;border-left:3px solid var(--accent)">
          <div style="margin-bottom:4px"><span style="color:var(--accent);font-weight:700">每个交易日收盘后：</span></div>
          <div>① 计算各资产最近 <b>${lb} 日收益 R</b> 和 <b>年化波动率 V</b></div>
          <div>② 仅保留 R &gt; 0 的资产</div>
          <div>③ 计算 <b>R/V 得分</b>，持有得分最高的资产</div>
          <div>④ 持仓比例 <b>${rw}%</b>，其余 <b>${100 - parseInt(rw)}%</b> 持逆回购</div>
          <div>⑤ 若无资产符合条件：<b>全仓逆回购</b>（防御模式）</div>
          <div>⑥ 换仓后冷却 <b>${cd} 天</b></div>
        </div>
      </div>

      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">策略参数</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tbody>${paramHtml}</tbody>
        </table>

        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">回测验证</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:left;font-weight:400">时段</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">年化</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">夏普</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">最大回撤</th>
            </tr>
          </thead>
          <tbody>${kpiHtml}</tbody>
        </table>

        <div style="margin-top:4px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:12px">
          策略来源：CSCV/PBO 方法论，18只ETF宇宙遍历，PBO=0.014，WF 8/8=100%。
          研究文档：STRATEGY_RESEARCH_CONCLUSIONS.md
        </div>
      </div>
    </div>
  `;
}
