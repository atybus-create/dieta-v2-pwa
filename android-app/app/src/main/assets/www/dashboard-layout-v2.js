(() => {
  'use strict';

  const loadCss = (id, href) => {
    const old = document.getElementById(id);
    if (old) old.remove();
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  loadCss('dashboard-layout-v2-css', './dashboard-layout-v2.css?v=20260819-dashboard4');
  loadCss('dashboard-card-hotfix-css', './dashboard-card-hotfix.css?v=20260819-rootfix2');
})();