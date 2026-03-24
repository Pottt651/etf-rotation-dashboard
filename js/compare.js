// Tab2: 策略对比

let compareInited = false;
let multiChart = null;
let radarChartInst = null;
let selectedStrategies = new Set();
let currentFilter = '全部';
let currentTimeRange = '全部';

function initCompare() {
  if (compareInited) return;
  compareInited = true;

  const d = window.COMPARE_DATA;
  if (!d) return;

  buildFilterBtns(d.strategies);
  renderRankTable(d.strategies);
  initMultiNav(d.strategies);
  renderAnnualTable(d.strategies);
}

function buildFilterBtns(strategies) {
  const verdicts = ['全部', ...new Set(strategies.map(s => s.verdict).filter(Boolean))];
  const bar = document.getElementById('verdict-filter');
  bar.innerHTML = verdicts.map(v =>
    `<button class="tab-btn ${v === '全部' ? 'active' : ''}" onclick="filterByVerdict('${v}', this)">${v}</button>`
  ).join('');
}

function filterByVerdict(v, btn) {
  currentFilter = v;
  document.querySelectorAll('#verdict-filter .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const d = window.COMPARE_DATA;
  const filtered = v === '全部' ? d.strategies : d.strategies.filter(s => s.verdict === v);
  renderRankTable(filtered);
  renderAnnualTable(filtered);
}

function fmt2(v, isPercent = true) {
  if (v == null) return '--';
  const n = isPercent ? v * 100 : v;
  return (n >= 0 ? '+' : '') + n.toFixed(1) + (isPercent ? '%' : '');
}

function renderRankTable(strategies) {
  const tbody = document.getElementById('rank-tbody');
  tbody.innerHTML = strategies.slice(0, 25).map((s, i) => {
    const isMain = s.id === 'diversified_broad_plus_sharpe_2';
    return `
      <tr style="${isMain ? 'background:rgba(230,184,0,0.08)' : ''}">
        <td>${s.practical_rank}</td>
        <td>
          <span class="verdict-tag verdict-${s.verdict}">${s.verdict}</span>
          <span style="margin-left:6px">${s.name}</span>
          ${isMain ? '<span style="color:#e6b800;font-size:11px"> ★主策略</span>' : ''}
        </td>
        <td style="color:${s.kpi.cagr>=0?'var(--green)':'var(--red)'}">${fmt2(s.kpi.cagr)}</td>
        <td>${s.kpi.sharpe.toFixed(2)}</td>
        <td style="color:var(--red)">${fmt2(s.kpi.max_dd)}</td>
        <td style="color:var(--accent)">${s.practical_score.toFixed(1)}</td>
        <td>
          <button class="tab-btn" style="padding:4px 10px;font-size:11px"
            onclick="toggleNav('${s.id}', this)">对比</button>
        </td>
      </tr>`;
  }).join('');
}

function toggleNav(id, btn) {
  const d = window.COMPARE_DATA;
  if (selectedStrategies.has(id)) {
    selectedStrategies.delete(id);
    btn.classList.remove('active');
  } else {
    selectedStrategies.add(id);
    btn.classList.add('active');
  }
  updateMultiNav(d.strategies);

  // 更新雷达图
  const s = d.strategies.find(x => x.id === id);
  if (s && selectedStrategies.has(id)) {
    updateRadar(s);
  }
}

function initMultiNav(strategies) {
  // 默认显示主策略
  const main = strategies.find(s => s.id === 'diversified_broad_plus_sharpe_2');
  if (main) {
    selectedStrategies.add(main.id);
    updateMultiNav(strategies);
  }
  // 雷达图
  if (main) updateRadar(main);
}

// 根据时间范围过滤日期+值序列
function applyTimeRange(dates, values, range) {
  if (range === '全部') return { dates, values };
  const today = new Date();
  let cutoff;
  if (range === 'YTD') {
    cutoff = new Date(today.getFullYear(), 0, 1);
  } else if (range === '1Y') {
    cutoff = new Date(today.getTime() - 365 * 24 * 3600 * 1000);
  } else if (range === '3Y') {
    cutoff = new Date(today.getTime() - 1095 * 24 * 3600 * 1000);
  } else {
    return { dates, values };
  }
  const cutStr = cutoff.toISOString().slice(0, 10);
  let startIdx = 0;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= cutStr) { startIdx = i; break; }
  }
  const filteredDates = dates.slice(startIdx);
  const filteredValues = values.slice(startIdx);
  // 归一化：以第一个可见点为基准
  if (filteredValues.length > 0) {
    const base = filteredValues[0];
    return {
      dates: filteredDates,
      values: filteredValues.map(v => v / base),
    };
  }
  return { dates: filteredDates, values: filteredValues };
}

function filterTimeRange(range, btn) {
  currentTimeRange = range;
  document.querySelectorAll('#time-range-filter .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const d = window.COMPARE_DATA;
  updateMultiNav(d.strategies);
}

function updateMultiNav(strategies) {
  const COLORS_LIST = ['#e6b800','#448aff','#00c853','#ff9800','#ab47bc','#ff5252','#00bcd4'];
  const selected = strategies.filter(s => selectedStrategies.has(s.id));
  if (!selected.length) return;

  // Bug 2 fix: align all series to a common date union with forward-fill
  // Collect all unique dates across selected series
  const dateSet = new Set();
  for (const s of selected) {
    for (const d of s.nav.dates) dateSet.add(d);
  }
  const allDates = Array.from(dateSet).sort();

  // For each series, build Map of date->value, then forward-fill over allDates
  const alignedSeries = selected.map((s, i) => {
    const dateValMap = new Map();
    for (let j = 0; j < s.nav.dates.length; j++) {
      dateValMap.set(s.nav.dates[j], s.nav.values[j]);
    }
    const alignedValues = [];
    let lastVal = null;
    for (const dt of allDates) {
      if (dateValMap.has(dt)) {
        lastVal = dateValMap.get(dt);
      }
      // Only include dates on or after the series start date
      if (dt >= s.nav.dates[0]) {
        alignedValues.push(lastVal);
      } else {
        alignedValues.push(null);
      }
    }
    return {
      name: s.name,
      dates: allDates,
      values: alignedValues,
      color: COLORS_LIST[i % COLORS_LIST.length],
      width: s.id === 'diversified_broad_plus_sharpe_2' ? 3 : 1.5,
      rawDates: s.nav.dates,
      rawValues: s.nav.values,
      id: s.id,
    };
  });

  // Apply time range filter
  const filteredSeries = alignedSeries.map(s => {
    const { dates: fd, values: fv } = applyTimeRange(s.dates, s.values, currentTimeRange);
    return { ...s, dates: fd, values: fv };
  });

  const el = document.getElementById('multi-nav-chart');
  if (multiChart) { multiChart.dispose(); }
  multiChart = navChart(el, filteredSeries);
}

function updateRadar(s) {
  const el = document.getElementById('radar-chart');
  if (radarChartInst) radarChartInst.dispose();
  radarChartInst = radarChart(el, s.scores, s.name);
}

function renderAnnualTable(strategies) {
  const top = strategies.slice(0, 15);
  const allYears = [...new Set(top.flatMap(s => s.annual.map(a => a.year)))].sort();

  const thead = document.getElementById('annual-thead');
  const tbody = document.getElementById('annual-tbody');

  thead.innerHTML = `<tr><th>策略</th>${allYears.map(y => `<th>${y}</th>`).join('')}</tr>`;
  tbody.innerHTML = top.map(s => {
    const yearMap = Object.fromEntries(s.annual.map(a => [a.year, a.return]));
    const cells = allYears.map(y => {
      const v = yearMap[y];
      if (v == null) return `<td>--</td>`;
      const pct = (v * 100).toFixed(0);
      const cls = v >= 0 ? 'annual-cell-pos' : 'annual-cell-neg';
      return `<td class="${cls}">${v >= 0 ? '+' : ''}${pct}%</td>`;
    }).join('');
    const isMain = s.id === 'diversified_broad_plus_sharpe_2';
    return `<tr style="${isMain ? 'background:rgba(230,184,0,0.08)' : ''}">
      <td style="text-align:left;font-size:11px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${isMain ? '★ ' : ''}${s.name}
      </td>${cells}
    </tr>`;
  }).join('');
}
