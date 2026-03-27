// 全局路由 + Tab 初始化

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.getElementById('theme-btn').textContent = isLight ? '🌙 深色' : '☀ 浅色';
}

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');

  if (name === 'cockpit') initCockpit();
  if (name === 'compare') initCompare();
  if (name === 'research') initResearch();
  if (name === 'report') initReport();
}

document.addEventListener('DOMContentLoaded', () => {
  // 显示更新时间
  const t = window.COCKPIT_DATA && window.COCKPIT_DATA.generated_at;
  if (t) {
    document.getElementById('update-time').textContent = '数据截至 ' + t.slice(0, 10);
  }
  switchTab('cockpit');
});
