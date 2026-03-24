// ECharts 封装层 - 统一配置和常用图表

const COLORS = {
  accent: '#e6b800', green: '#00c853', red: '#ff5252',
  blue: '#448aff', dim: '#8892a4', border: '#2a3a5c',
  strategy: '#e6b800', benchmark: '#8892a4',
  dividend_lowvol: '#ff9800', nasdaq: '#448aff',
  nev: '#00c853', telecom: '#ab47bc', repo131810: '#8892a4',
};

const BASE_OPTS = {
  backgroundColor: 'transparent',
  textStyle: { color: '#e0e0e0', fontFamily: "'Noto Sans SC', sans-serif" },
  grid: { top: 40, right: 20, bottom: 60, left: 70, containLabel: false },
};

function mergeDeep(base, ext) {
  const res = Object.assign({}, base);
  for (const k of Object.keys(ext)) {
    if (ext[k] && typeof ext[k] === 'object' && !Array.isArray(ext[k])
        && base[k] && typeof base[k] === 'object') {
      res[k] = mergeDeep(base[k], ext[k]);
    } else {
      res[k] = ext[k];
    }
  }
  return res;
}

function makeChart(el) {
  if (typeof el === 'string') el = document.getElementById(el);
  const c = echarts.init(el, 'dark');
  window.addEventListener('resize', () => c.resize());
  return c;
}

function navChart(el, seriesList) {
  // seriesList: [{name, dates, values, color, width}]
  const chart = makeChart(el);
  const opts = mergeDeep(BASE_OPTS, {
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        let s = `<div style="font-size:12px"><b>${params[0].axisValue}</b><br>`;
        params.forEach(p => {
          const v = p.value;
          const pct = ((v - 1) * 100).toFixed(1);
          const col = pct >= 0 ? COLORS.green : COLORS.red;
          s += `<span style="color:${p.color}">●</span> ${p.seriesName}: `;
          s += `<b style="color:${col}">${pct >= 0 ? '+' : ''}${pct}%</b> (${v.toFixed(3)})<br>`;
        });
        return s + '</div>';
      }
    },
    legend: {
      top: 8, right: 10,
      textStyle: { color: '#e0e0e0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: seriesList[0].dates,
      axisLabel: { color: COLORS.dim, fontSize: 11,
        formatter(v) { return v.slice(0, 7); },
        showMaxLabel: true,
      },
      axisLine: { lineStyle: { color: COLORS.border } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: COLORS.dim, fontSize: 11,
        formatter: v => ((v - 1) * 100).toFixed(0) + '%',
      },
      splitLine: { lineStyle: { color: COLORS.border, type: 'dashed' } },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', height: 24, bottom: 4,
        textStyle: { color: COLORS.dim }, borderColor: COLORS.border,
        fillerColor: 'rgba(230,184,0,0.1)',
      }
    ],
    series: seriesList.map(s => ({
      name: s.name,
      type: 'line',
      data: s.values,
      smooth: false,
      symbol: 'none',
      lineStyle: { color: s.color || COLORS.accent, width: s.width || 2 },
      itemStyle: { color: s.color || COLORS.accent },
    })),
  });
  chart.setOption(opts);
  return chart;
}

function annualBarChart(el, annualData) {
  // annualData: [{year, strategy}]
  const chart = makeChart(el);
  const years = annualData.map(d => d.year);
  const vals = annualData.map(d => d.strategy);
  chart.setOption(mergeDeep(BASE_OPTS, {
    grid: { top: 20, right: 20, bottom: 40, left: 60 },
    tooltip: {
      trigger: 'axis',
      formatter(p) {
        const v = (p[0].value * 100).toFixed(1);
        return `${p[0].name}年: ${v >= 0 ? '+' : ''}${v}%`;
      }
    },
    xAxis: { type: 'category', data: years.map(String),
      axisLabel: { color: COLORS.dim, fontSize: 11 },
      axisLine: { lineStyle: { color: COLORS.border } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: COLORS.dim, fontSize: 11,
        formatter: v => (v * 100).toFixed(0) + '%' },
      splitLine: { lineStyle: { color: COLORS.border, type: 'dashed' } },
    },
    series: [{
      type: 'bar',
      data: vals.map(v => ({
        value: v,
        itemStyle: { color: v >= 0 ? COLORS.green : COLORS.red, opacity: 0.85 },
      })),
    }],
  }));
  return chart;
}

function multiNavChart(el, seriesList) {
  // 多策略净值叠加，同 navChart 但不强制同 xAxis
  return navChart(el, seriesList);
}

function radarChart(el, scores, name) {
  const chart = makeChart(el);
  const indicators = [
    { name: '样本外', max: 100 },
    { name: '成本韧性', max: 100 },
    { name: '流动性', max: 100 },
    { name: '执行简洁', max: 100 },
    { name: '回撤安全', max: 100 },
  ];
  chart.setOption({
    backgroundColor: 'transparent',
    radar: {
      indicator: indicators,
      axisName: { color: COLORS.dim, fontSize: 12 },
      splitLine: { lineStyle: { color: COLORS.border } },
      splitArea: { areaStyle: { color: ['rgba(42,58,92,.4)', 'rgba(22,33,62,.4)'] } },
    },
    series: [{
      type: 'radar',
      data: [{
        name,
        value: [scores.oos, scores.cost_resilience, scores.liquidity, scores.execution, scores.drawdown_safety],
        itemStyle: { color: COLORS.accent },
        areaStyle: { color: 'rgba(230,184,0,0.2)' },
        lineStyle: { color: COLORS.accent, width: 2 },
      }],
    }],
  });
  return chart;
}
