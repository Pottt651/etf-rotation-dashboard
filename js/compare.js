// Tab2: 策略对比

let compareInited = false;
let multiChart = null;
let radarChartInst = null;
let selectedStrategies = new Set();
let currentFilter = '全部';

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

function updateMultiNav(strategies) {
  const COLORS_LIST = ['#e6b800','#448aff','#00c853','#ff9800','#ab47bc','#ff5252','#00bcd4'];
  const series = strategies
    .filter(s => selectedStrategies.has(s.id))
    .map((s, i) => ({
      name: s.name,
      dates: s.nav.dates,
      values: s.nav.values,
      color: COLORS_LIST[i % COLORS_LIST.length],
      width: s.id === 'diversified_broad_plus_sharpe_2' ? 3 : 1.5,
    }));
  if (!series.length) return;

  const el = document.getElementById('multi-nav-chart');
  if (multiChart) { multiChart.dispose(); }
  multiChart = navChart(el, series);
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
