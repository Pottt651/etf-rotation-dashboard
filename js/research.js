// research.js — 研究实验室 Tab（v2 数据格式）

function initResearch() {
  const d = window.RESEARCH_DATA;
  if (!d) { document.getElementById('research-content').innerHTML = '<div class="card"><p style="color:#888">研究数据未加载</p></div>'; return; }

  const el = document.getElementById('research-content');
  el.innerHTML = '';

  // 1. 搜索统计卡
  const ss = d.search_stats || {};
  el.innerHTML += `
    <div class="card">
      <div class="card-title">v2 研究规模（系统化搜索）</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:8px">
        ${kpiBox('ETF宇宙', (ss.etf_count||0) + ' 只')}
        ${kpiBox('组合总数', (ss.combo_count||0).toLocaleString())}
        ${kpiBox('Stage1通过', (ss.stage1_pass||0).toLocaleString())}
        ${kpiBox('CSCV通过', (ss.cscv_pass||0).toLocaleString())}
        ${kpiBox('WF通过', (ss.wf_pass||0))}
        ${kpiBox('Holdout显著', ss.holdout_significant||0)}
        ${kpiBox('IS期', ss.is_period||'')}
        ${kpiBox('Holdout期', ss.holdout_period||'')}
      </div>
    </div>`;

  // 2. 随机基准对照
  const rb = d.random_baseline || {};
  if (rb.n) {
    el.innerHTML += `
      <div class="card">
        <div class="card-title">随机基准对照（${rb.n} 个随机4资产组合）</div>
        <table class="rank-table" style="font-size:13px;max-width:500px">
          <thead><tr><th>分位数</th><th>IS Sharpe</th><th>PBO</th></tr></thead>
          <tbody>
            <tr><td>P5</td><td>${(rb.sharpe_p5||0).toFixed(3)}</td><td>${(rb.pbo_p5||0).toFixed(3)}</td></tr>
            <tr><td>P50</td><td>${(rb.sharpe_p50||0).toFixed(3)}</td><td>${(rb.pbo_p50||0).toFixed(3)}</td></tr>
            <tr><td>P95</td><td>${(rb.sharpe_p95||0).toFixed(3)}</td><td>${(rb.pbo_p95||0).toFixed(3)}</td></tr>
          </tbody>
        </table>
      </div>`;
  }

  // 3. Holdout 最终评估
  const hr = d.holdout_results || [];
  let hRows = hr.map(r => {
    const sig = r.significant ? '<span style="color:#2e7d32;font-weight:600">✅</span>' : '<span style="color:#888">❌</span>';
    const shClass = r.h_sharpe >= 1.5 ? 'good' : r.h_sharpe >= 0.7 ? 'ok' : 'bad';
    const mddClass = r.h_mdd > -15 ? 'good' : r.h_mdd > -25 ? 'ok' : 'bad';
    const pStr = r.p_value < 0.001 ? r.p_value.toExponential(2) : r.p_value.toFixed(4);
    return `<tr${r.significant?' style="background:rgba(67,160,71,.12)"':''}>
      <td style="text-align:left">${r.name}</td>
      <td>${r.pbo}</td><td>${r.wf_sharpe}</td>
      <td class="${r.h_cagr>30?'good':r.h_cagr>10?'ok':'bad'}">${r.h_cagr}%</td>
      <td class="${shClass}">${r.h_sharpe}</td>
      <td class="${mddClass}">${r.h_mdd}%</td>
      <td>${pStr}</td>
      <td>${sig}</td>
      <td>${r.boot_p10}%</td>
      <td style="font-size:12px;color:#aaa">${r.is_years}yr</td>
    </tr>`;
  }).join('');

  el.innerHTML += `
    <div class="card" style="overflow-x:auto">
      <div class="card-title">Holdout 最终验证（Bonferroni 校正 α=0.0167）</div>
      <table class="rank-table" style="font-size:13px">
        <thead><tr>
          <th style="text-align:left">策略</th>
          <th>PBO</th><th>WF Sharpe</th>
          <th>Holdout CAGR</th><th>Holdout Sharpe</th><th>Holdout MDD</th>
          <th>p值</th><th>显著</th>
          <th>Boot p10</th><th>IS年</th>
        </tr></thead>
        <tbody>${hRows}</tbody>
      </table>
    </div>`;

  // 4. Top 30 CSCV 表
  const top = d.top30_cscv || [];
  let cscvRows = top.map((r, i) => {
    return `<tr>
      <td>${i+1}</td>
      <td style="text-align:left">${r.name}</td>
      <td>${r.pbo}</td>
      <td>${(r.is_sharpe||0).toFixed(2)}</td>
      <td>${r.is_cagr}%</td>
      <td>${r.is_mdd}%</td>
      <td style="color:#888">${r.is_years}yr</td>
      <td style="font-size:11px;color:#888">lb=${r.lb} ${r.mode} rw=${r.rw} cd=${r.cd}</td>
    </tr>`;
  }).join('');

  el.innerHTML += `
    <div class="card" style="overflow-x:auto">
      <div class="card-title">CSCV Top 30（${(ss.combo_count||0).toLocaleString()} 组合 → ${(ss.stage1_pass||0).toLocaleString()} Stage1 → ${(ss.cscv_pass||0).toLocaleString()} PBO≤0.35）</div>
      <table class="rank-table" style="font-size:12px">
        <thead><tr>
          <th>#</th><th style="text-align:left">策略</th>
          <th>PBO</th><th>IS Sharpe</th><th>IS CAGR</th><th>IS MDD</th>
          <th>IS年</th><th>参数</th>
        </tr></thead>
        <tbody>${cscvRows}</tbody>
      </table>
    </div>`;
}

function kpiBox(label, val) {
  return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:10px 14px;text-align:center">
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:600">${val}</div>
  </div>`;
}
