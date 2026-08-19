(() => {
  'use strict';
  if (document.getElementById('dashboard-layout-v2-css')) return;
  const link = document.createElement('link');
  link.id = 'dashboard-layout-v2-css';
  link.rel = 'stylesheet';
  link.href = './dashboard-layout-v2.css?v=20260819-dashboard1';
  document.head.appendChild(link);
})();