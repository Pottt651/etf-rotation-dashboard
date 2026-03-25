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

function renderStrategyDetail(d) {
  const el = document.getElementById('strategy-detail-body');
  if (!el) return;
  const note = d.optimization_note || {};
  const kpi  = d.kpi || {};
  const rec  = note.recommended || {};
  const pool = note.pool_v3 || ['512800银行','515880通信','515030新能车','513500标普500'];
  const vs   = note.oos_vs_v2 || {};

  // 标的池色块
  const assetColors = {'512800':'#e6b800','515880':'#ab47bc','515030':'#00c853','513500':'#448aff','131810':'#8892a4'};
  const assetNames  = {'512800':'银行ETF','515880':'通信ETF','515030':'新能源车ETF','513500':'标普500ETF','131810':'逆回购'};
  const allAssets   = ['512800','515880','515030','513500','131810'];

  const poolHtml = allAssets.map(code => {
    const isRepo = code === '131810';
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
            border-radius:6px;background:var(--bg-hover);border-left:3px solid ${assetColors[code]}">
      <span style="font-size:18px;font-weight:700;color:${assetColors[code]}">${code}</span>
      <div>
        <div style="font-weight:600;font-size:13px">${assetNames[code]}</div>
        <div style="font-size:11px;color:var(--text-dim)">${isRepo ? '防守资产（现金等价）' : '风险资产'}</div>
      </div>
    </div>`;
  }).join('');

  // 参数表
  const params = [
    ['回看窗口 lookback', `${rec.lookback || 15} 天`, '计算动量和波动率的天数'],
    ['收益门槛 threshold', `${((rec.threshold||0.001)*100).toFixed(1)}%`, '15日涨幅必须高于此值才有资格'],
    ['冷却期 cooldown',    `${rec.cooldown || 5} 天`, '换仓后强制持有的最短天数'],
    ['确认窗口 confirm',   `${rec.confirm_lb || 10} 天`, '二次确认：候选资产确认期也必须为正'],
    ['风险仓位 risk_weight', `${((rec.risk_weight||0.75)*100).toFixed(0)}%`, '75% 持风险资产，25% 始终在逆回购'],
  ];
  const paramHtml = params.map(([name, val, desc]) =>
    `<tr>
      <td style="padding:6px 12px;font-size:13px;color:var(--text-dim)">${name}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;color:var(--accent);text-align:center">${val}</td>
      <td style="padding:6px 12px;font-size:12px;color:var(--text-dim)">${desc}</td>
    </tr>`
  ).join('');

  // OOS 指标
  const oosRows = [
    ['全期年化 (2020~)', `${(kpi.cagr*100).toFixed(1)}%`, `${kpi.sharpe}`, `${(kpi.max_drawdown*100).toFixed(1)}%`],
    ['样本外 (2022~)',   `${(kpi.oos_cagr*100).toFixed(1)}%`, `${kpi.oos_sharpe}`, `${(kpi.oos_maxdd*100).toFixed(1)}%`],
  ];
  const oosHtml = oosRows.map(([label, cagr, sharpe, dd]) =>
    `<tr>
      <td style="padding:6px 12px;font-size:13px;color:var(--text-dim)">${label}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;color:var(--green);text-align:center">${cagr}</td>
      <td style="padding:6px 12px;font-size:13px;font-weight:600;text-align:center">${sharpe}</td>
      <td style="padding:6px 12px;font-size:13px;color:var(--red);text-align:center">${dd}</td>
    </tr>`
  ).join('');

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">

      <!-- 左列 -->
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">标的池</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
          ${poolHtml}
        </div>

        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">信号逻辑</div>
        <div style="font-size:13px;line-height:1.8;background:var(--bg-hover);padding:14px 16px;border-radius:6px;border-left:3px solid var(--accent)">
          <div style="margin-bottom:4px"><span style="color:var(--accent);font-weight:700">每个交易日收盘后：</span></div>
          <div>① 计算四资产各自 <b>15日收益 R</b> 和 <b>年化波动率 V</b></div>
          <div>② 仅保留 R &gt; 0.1% 的资产（收益门槛）</div>
          <div>③ 若该资产同时满足 <b>10日确认窗口也为正</b>，计算 <b>R/V 得分</b></div>
          <div>④ 持有 R/V 最高的资产（75% 仓位 + 25% 逆回购）</div>
          <div>⑤ 若无资产符合条件：<b>全仓逆回购</b>（防御模式）</div>
          <div>⑥ 换仓后 <b>冷却 5 天</b>，期间不再重新判断</div>
        </div>
      </div>

      <!-- 右列 -->
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">策略参数</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tbody>${paramHtml}</tbody>
        </table>

        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">回测验证（样本外 2022~2026）</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:left;font-weight:400">时段</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">年化</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">夏普</th>
              <th style="padding:6px 12px;font-size:12px;color:var(--text-dim);text-align:center;font-weight:400">最大回撤</th>
            </tr>
          </thead>
          <tbody>${oosHtml}</tbody>
        </table>

        <div style="font-size:13px;font-weight:600;color:var(--text-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">观察池（备选方案）</div>
        <div style="font-size:12px;background:var(--bg-hover);padding:12px 14px;border-radius:6px">
          <div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border)">
            <span style="color:var(--blue)">●</span>
            <b style="margin-left:4px">创业板+5G+通信+标普500</b>
            <span style="color:var(--text-dim);margin-left:8px">Sharpe 1.72 | MaxDD -11.1%</span>
          </div>
          <div>
            <span style="color:var(--green)">●</span>
            <b style="margin-left:4px">计算机+通信+红利低波+纳指</b>
            <span style="color:var(--text-dim);margin-left:8px">Sharpe 1.70 | Bootstrap p10 26.4%</span>
          </div>
        </div>

        <div style="margin-top:16px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);padding-top:12px">
          搜索依据：全32只行业ETF宇宙，8371个有效组合，样本外两次独立验证。
          决策文档：output/strategy_v3_decision.md
        </div>
      </div>

    </div>
  `;
}
