// Tab3: 研究实验室

let researchInited = false;

function initResearch() {
  if (researchInited) return;
  researchInited = true;
  const d = window.RESEARCH_DATA;
  if (!d) {
    document.getElementById('research-content').innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:60px">暂无研究数据</div>';
    return;
  }
  renderCandidateTable(d.candidates);
  renderOOSChart(d.candidates);
  renderBootstrapTable(d.candidates);
  renderOptimizationTable(d.optimization);
}

function fmt3(v, pct=true) {
  if (v == null) return '--';
  const n = pct ? v * 100 : v;
  return (n >= 0 ? '+' : '') + n.toFixed(1) + (pct ? '%' : '');
}

function colorVal(v) {
  if (v == null) return 'var(--text-dim)';
  return v >= 0 ? 'var(--green)' : 'var(--red)';
}

function renderCandidateTable(candidates) {
  const el = document.getElementById('candidate-table-body');
  el.innerHTML = candidates.map(c => {
    const k = c.kpi_full || {};
    const o = c.kpi_oos || {};
    const b = c.bootstrap || {};
    const s = c.sensitivity || {};
    return `<tr>
      <td style="text-align:left;font-weight:600">${c.label}</td>
      <td>${c.kpi_full ? c.kpi_full.cagr != null ? fmt3(c.kpi_full.cagr) : '--' : '--'}</td>
      <td>${c.kpi_full ? c.kpi_full.sharpe != null ? c.kpi_full.sharpe.toFixed(2) : '--' : '--'}</td>
      <td style="color:var(--red)">${c.kpi_full ? c.kpi_full.max_dd != null ? fmt3(c.kpi_full.max_dd) : '--' : '--'}</td>
      <td style="color:${colorVal(o.cagr)}">${fmt3(o.cagr)}</td>
      <td>${o.sharpe != null ? o.sharpe.toFixed(2) : '--'}</td>
      <td style="color:var(--blue)">${b.p10 != null ? fmt3(b.p10) : '--'}</td>
      <td>${b.p50 != null ? fmt3(b.p50) : '--'}</td>
      <td style="color:var(--text-dim)">${s.survival_cagr_gt20 != null ? (s.survival_cagr_gt20*100).toFixed(0)+'%' : '--'}</td>
    </tr>`;
  }).join('');
}

function renderOOSChart(candidates) {
  const hasnav = candidates.filter(c => c.nav && c.nav.dates && c.nav.dates.length > 0);
  if (!hasnav.length) return;
  const COLORS_LIST = ['#e6b800','#448aff','#00c853','#ff9800','#ab47bc','#ff5252','#00bcd4','#8892a4'];

  // Bug 4 fix: align all series to a common date union with forward-fill
  const dateSet = new Set();
  for (const c of hasnav) {
    for (const d of c.nav.dates) dateSet.add(d);
  }
  const allDates = Array.from(dateSet).sort();

  const series = hasnav.map((c, i) => {
    const dateValMap = new Map();
    for (let j = 0; j < c.nav.dates.length; j++) {
      dateValMap.set(c.nav.dates[j], c.nav.values[j]);
    }
    const alignedValues = [];
    let lastVal = null;
    for (const dt of allDates) {
      if (dateValMap.has(dt)) {
        lastVal = dateValMap.get(dt);
      }
      if (dt >= c.nav.dates[0]) {
        alignedValues.push(lastVal);
      } else {
        alignedValues.push(null);
      }
    }
    return {
      name: c.label,
      dates: allDates,
      values: alignedValues,
      color: COLORS_LIST[i % COLORS_LIST.length],
      width: 1.5,
    };
  });
  navChart('oos-nav-chart', series);
}

function renderBootstrapTable(candidates) {
  const el = document.getElementById('bootstrap-table-body');
  el.innerHTML = candidates.filter(c => c.bootstrap).map(c => {
    const b = c.bootstrap;
    return `<tr>
      <td style="text-align:left">${c.label}</td>
      <td style="color:var(--text-dim)">${fmt3(b.p10)}</td>
      <td>${fmt3(b.p50)}</td>
      <td style="color:var(--green)">${fmt3(b.p90)}</td>
      <td style="color:var(--text-dim)">${b.sharpe_p10 != null ? b.sharpe_p10.toFixed(2) : '--'}</td>
      <td>${b.sharpe_p50 != null ? b.sharpe_p50.toFixed(2) : '--'}</td>
    </tr>`;
  }).join('');
}

function renderOptimizationTable(opt) {
  const el = document.getElementById('opt-section');
  if (!opt || !opt.length) {
    el.innerHTML = '<div style="color:var(--text-dim);font-size:13px">运行 python optimize_deep.py 生成优化结果</div>';
    return;
  }
  const cols = ['lookback','cooldown','confirm_lb','risk_weight',
                'cagr_oos','sharpe_oos','maxdd_oos','switches_yr','boot_p10','boot_prob_pos'];
  const labels = {
    lookback:'回看', cooldown:'冷却', confirm_lb:'确认窗口',
    risk_weight:'仓位', threshold:'门槛',
    cagr_oos:'OOS年化', sharpe_oos:'OOS夏普', maxdd_oos:'OOS回撤',
    switches_yr:'年换手', boot_p10:'Boot p10', boot_prob_pos:'正收益率',
    '4x_cagr':'4倍费率'
  };

  const html = `
    <table class="rank-table" style="font-size:11px">
      <thead><tr>${cols.map(c => `<th>${labels[c]||c}</th>`).join('')}</tr></thead>
      <tbody>
        ${opt.map((row, i) => {
          return `<tr style="${i===0 ? 'background:rgba(230,184,0,0.12);font-weight:600' : ''}">
            ${cols.map(c => {
              const v = row[c];
              let txt = v != null ? (
                ['cagr_oos','maxdd_oos','boot_p10','4x_cagr'].includes(c) ? fmt3(v) :
                c === 'boot_prob_pos' ? (v*100).toFixed(0)+'%' :
                c === 'risk_weight' ? (v*100).toFixed(0)+'%' :
                c === 'threshold' ? (v*100).toFixed(1)+'%' :
                typeof v === 'number' ? v.toFixed(c==='sharpe_oos'?2:1) : '--'
              ) : '--';
              let color = '';
              if (c==='cagr_oos'||c==='boot_p10') color = colorVal(v);
              if (c==='maxdd_oos') color = 'var(--red)';
              if (c==='boot_prob_pos') color = v != null && v >= 0.99 ? 'var(--green)' : 'var(--text)';
              return `<td style="color:${color||'inherit'}">${txt}</td>`;
            }).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="font-size:11px;color:var(--text-dim);margin-top:8px">第1行为当前采用参数 ✅ | Bootstrap 400次 OOS(2022~)抽样</div>
  `;
  el.innerHTML = html;
}
