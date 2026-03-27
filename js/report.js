/**
 * report.js — 研究报告 Tab 的图表渲染
 */

function initReport() {
  renderEtfFunnel();
  renderPipelineFunnel();
  renderBootstrapBox();
}

function renderEtfFunnel() {
  const el = document.getElementById('etf-funnel-chart');
  if (!el) return;
  const chart = echarts.init(el);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}只' },
    series: [{
      type: 'funnel',
      left: '10%', width: '80%',
      minSize: '20%', maxSize: '100%',
      sort: 'descending',
      gap: 4,
      label: { show: true, position: 'inside', fontSize: 12, color: '#fff',
                formatter: p => `${p.name}\n${p.value}只` },
      data: [
        { name: '全量ETF', value: 1489 },
        { name: '2018年底前上市', value: 200 },
        { name: '排除债/货币', value: 120 },
        { name: '日均≥3000万', value: 35 },
      ],
      color: ['#1565c0','#1976d2','#42a5f5','#90caf9'],
    }]
  });
}

function renderPipelineFunnel() {
  const el = document.getElementById('pipeline-funnel-chart');
  if (!el) return;
  const chart = echarts.init(el);
  const data = [
    { name: '全量组合', value: 52360, color: '#455a64' },
    { name: 'Stage1: IS Sharpe≥0.7', value: 3743, color: '#1565c0' },
    { name: 'Stage2: CSCV PBO≤0.35', value: 2360, color: '#1976d2' },
    { name: 'Stage3: WF通过', value: 23, color: '#0288d1' },
    { name: 'Stage5: Holdout显著', value: 1, color: '#2e7d32' },
  ];
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: p => `${p.name}: ${p.value.toLocaleString()}个` },
    series: [{
      type: 'funnel',
      left: '5%', width: '90%',
      minSize: '3%', maxSize: '100%',
      sort: 'descending',
      gap: 3,
      label: {
        show: true, position: 'inside', fontSize: 12, color: '#fff',
        formatter: p => `${p.name}  (${p.value.toLocaleString()})`
      },
      data: data.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
    }]
  });
}

function renderBootstrapBox() {
  const el = document.getElementById('bootstrap-box-chart');
  if (!el) return;
  const chart = echarts.init(el);
  // p10=21.9%, p50=36.6%, p90=55.2% CAGR
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      data: ['Bootstrap CAGR 分布'],
      axisLabel: { color: 'var(--text-secondary)', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: v => (v*100).toFixed(0)+'%', color: 'var(--text-secondary)', fontSize: 11 },
      min: 0, max: 0.65,
    },
    series: [
      {
        type: 'boxplot',
        data: [[0.219, 0.219, 0.366, 0.552, 0.552]],
        // [min, Q1, median, Q3, max] — using p10/p50/p90 as proxy
        itemStyle: { color: 'rgba(25,118,210,.3)', borderColor: '#1976d2', borderWidth: 2 },
        tooltip: {
          formatter: p => `悲观(p10)：21.9%<br>中位数(p50)：36.6%<br>乐观(p90)：55.2%`
        }
      },
      {
        type: 'scatter',
        data: [[0, 0.221]], // WF CAGR reference
        symbolSize: 10,
        itemStyle: { color: '#e53935' },
        tooltip: { formatter: () => 'WF CAGR：22.1%（真实滚动样本外）' }
      }
    ]
  });
}
