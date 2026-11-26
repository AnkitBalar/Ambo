/* =========================================================
   view.js — જાહેર પેજ (વંશ વૃક્ષ / વંશાવળી / પરિવાર)
   ========================================================= */
(function (BF) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var esc = BF.esc, label = BF.label;
  var M = null, view = 'tree', lineId = null, famFilter = 'info', drawerId = null;
  var closed = new Set();
  var LS_LINE = 'balar-line-id';

  if (BF.mode === 'demo') $('#demoNote').hidden = false;

  /* ---------------- ડેટા ---------------- */
  BF.store.watch(function (list) {
    M = BF.model(list);
    $('#loading').hidden = true;
    renderStats();
    route();
    if (drawerId) { if (M.get(drawerId)) openDrawer(drawerId); else closeDrawer(); }
  }, function (err) {
    $('#loading').textContent = 'ડેટા લોડ ન થયો: ' + (err && err.message ? err.message : err);
  });

  /* ---------------- આંકડા ---------------- */
  function renderStats() {
    var males = 0, females = 0, fam = 0;
    M.list.forEach(function (p) {
      if (p.gender === 'f') females++; else { males++; if (M.kids(p.id).length) fam++; }
    });
    var s = [[M.maxGen(), 'પેઢી'], [M.list.length, 'કુલ સભ્યો'], [males, 'દિકરા'], [females, 'દિકરી'], [fam, 'પરિવાર']];
    $('#stats').innerHTML = s.map(function (x) { return '<div class="stat card"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
  }

  /* ---------------- રૂટ ---------------- */
  function route() {
    if (!M) return;
    var h = location.hash.replace(/^#/, '').split('/');
    view = ['tree', 'line', 'fam'].indexOf(h[0]) !== -1 ? h[0] : 'tree';
    if (view === 'line' && h[1] && M.get(decodeURIComponent(h[1]))) lineId = decodeURIComponent(h[1]);
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'v-' + view; });
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === view); });
    if (view === 'tree') renderTree();
    if (view === 'line') renderLine();
    if (view === 'fam') renderFam();
  }
  window.addEventListener('hashchange', route);

  /* ---------------- વંશ વૃક્ષ ---------------- */
  function node(p) {
    var sons = M.sons(p.id), ds = M.daughters(p.id), has = sons.length || ds.length;
    return '<li data-id="' + p.id + '"' + (closed.has(p.id) ? ' class="closed"' : '') + '>' +
      '<div class="row">' +
        (has ? '<button class="tog" type="button" data-tog aria-label="ખોલો / બંધ કરો">▼</button>' : '<span class="dot"></span>') +
        '<button class="nm" type="button" data-open="' + p.id + '">' + label(p) + '</button>' +
        (sons.length ? '<span class="badge" title="દિકરા">' + sons.length + '</span>' : '') +
      '</div>' +
      (ds.length ? '<div class="dg">' + ds.map(function (d) { return '<button type="button" data-open="' + d.id + '">' + label(d) + '</button>'; }).join(', ') + '</div>' : '') +
      (sons.length ? '<ul>' + sons.map(node).join('') + '</ul>' : '') +
    '</li>';
  }
  function chips(list, cls) {
    if (!list.length) return '<span class="none">—</span>';
    return '<div class="chips">' + list.map(function (p) { return '<button type="button" class="chip ' + cls + '" data-open="' + p.id + '">' + label(p) + '</button>'; }).join('') + '</div>';
  }

  function renderTree() {
    var html = '';
    var roots = M.roots().filter(function (p) { return p.gender !== 'f'; });
    if (!roots.length) { $('#treeBody').innerHTML = '<p class="loading">હજુ કોઈ નામ ઉમેરાયા નથી.</p>'; return; }
    roots.forEach(function (root) {
      var trunk = [root], cur = root;
      while (M.sons(cur.id).length === 1) { cur = M.sons(cur.id)[0]; trunk.push(cur); }
      var gen0 = M.gen(root.id);
      if (trunk.length > 1) {
        html += '<div class="trunk card"><h3>મૂળ પુરુષ થી ' + esc(cur.name) + ' સુધી</h3><ol>' +
          trunk.map(function (p, i) { return '<li><button type="button" data-open="' + p.id + '"><span class="n">' + (gen0 + i) + '</span>' + label(p) + '</button></li>'; }).join('') +
          '</ol></div>';
      }
      var groups = M.sons(cur.id);
      if (!groups.length) return;
      groups.forEach(function (g) {
        html += '<h3 class="group-title"><button type="button" data-open="' + g.id + '">' + label(g) + '</button>' +
          '<span class="muted small">– ' + esc(cur.name) + '</span><span class="badge">' + M.descCount(g.id) + ' સભ્યો</span><span class="line"></span></h3>';
        var gd = M.daughters(g.id);
        if (gd.length) html += '<div class="group-dau">' + chips(gd, 'dau') + '</div>';
        var cards = M.sons(g.id);
        if (!cards.length) { html += '<p class="muted small">દિકરા ની માહિતી નથી.</p>'; return; }
        html += '<div class="roots">' + cards.map(function (c, i) {
          var sons = M.sons(c.id), ds = M.daughters(c.id);
          return '<section class="root card" data-card="' + c.id + '"><header><span class="num">' + (i + 1) + '</span>' +
            '<button type="button" data-open="' + c.id + '">' + label(c) + '</button>' +
            '<span class="badge">' + M.descCount(c.id) + '</span></header>' +
            (ds.length ? '<div class="tree" style="padding-bottom:0"><div class="dg" style="margin-left:4px">' + ds.map(function (d) { return '<button type="button" data-open="' + d.id + '">' + label(d) + '</button>'; }).join(', ') + '</div></div>' : '') +
            (sons.length ? '<ul class="tree">' + sons.map(node).join('') + '</ul>' : '<p class="leaf-note muted small">દિકરા ની માહિતી નથી.</p>') +
            '</section>';
        }).join('') + '</div>';
      });
    });
    $('#treeBody').innerHTML = html;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tog]');
    if (t) {
      var li = t.closest('li'); li.classList.toggle('closed');
      if (li.classList.contains('closed')) closed.add(li.dataset.id); else closed.delete(li.dataset.id);
      return;
    }
    var o = e.target.closest('[data-open]');
    if (o) { openDrawer(o.dataset.open); return; }
    var a = e.target.closest('[data-all]');
    if (a) {
      closed.clear();
      if (a.dataset.all === 'close') M.list.forEach(function (p) { if (M.kids(p.id).length) closed.add(p.id); });
      renderTree();
    }
  });

  function showInTree(id) {
    var p = M.get(id); if (!p) return;
    var target = p.gender === 'f' && p.fatherId ? p.fatherId : id;
    M.chain(target).forEach(function (x) { closed.delete(x.id); });
    closeDrawer();
    if (view !== 'tree') { location.hash = '#tree'; } else renderTree();
    setTimeout(function () {
      var li = document.querySelector('#treeBody li[data-id="' + target + '"]') || document.querySelector('[data-card="' + target + '"]');
      if (!li) return;
      li.scrollIntoView({ behavior: 'smooth', block: 'center' });
      li.classList.add('flash'); setTimeout(function () { li.classList.remove('flash'); }, 2200);
    }, 60);
  }

  /* ---------------- વંશાવળી ---------------- */
  function defaultLine() {
    var saved = null; try { saved = localStorage.getItem(LS_LINE); } catch (e) { /* ignore */ }
    if (saved && M.get(saved)) return saved;
    var pin = M.list.find(function (p) { return p.pinned; });
    if (pin) return pin.id;
    var best = null, bg = 0;
    M.list.forEach(function (p) { var g = M.gen(p.id); if (g > bg) { bg = g; best = p; } });
    return best ? best.id : null;
  }
  function renderLine() {
    if (!lineId || !M.get(lineId)) lineId = defaultLine();
    if (!lineId) { $('#lineBody').innerHTML = '<p class="loading">હજુ કોઈ નામ નથી.</p>'; return; }
    var ch = M.chain(lineId), me = M.get(lineId);
    var html = '<ol class="lineage card">' + ch.map(function (p, i) {
      return '<li class="' + (p.id === lineId ? 'me' : '') + '"><span class="gen">' + (i + 1) + '</span>' +
        '<button type="button" class="nm" data-open="' + p.id + '">' + label(p) + '</button>' +
        (p.note ? '<span class="lnote">' + esc(p.note) + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
    var sons = M.sons(lineId), ds = M.daughters(lineId);
    html += '<div class="line-kids card">' +
      '<div class="krow son"><b>દિકરા</b>' + chips(sons, 'son') + '</div>' +
      '<div class="krow dau"><b>દિકરી</b>' + chips(ds, 'dau') + '</div>' +
      '<div class="tools" style="margin-top:6px"><button class="btn sm" type="button" id="copyLine">🔗 આ વંશાવળી ની લિંક કોપી કરો</button></div>' +
    '</div>';
    $('#lineBody').innerHTML = html;
    $('#lineQ').placeholder = 'પસંદ કરેલ: ' + me.name + ' — બીજું નામ શોધો…';
    $('#copyLine').addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#line/' + encodeURIComponent(lineId);
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { BF.toast('લિંક કોપી થઈ ગઈ'); },
        function () { BF.modal('<h3>લિંક</h3><div class="code">' + esc(url) + '</div>', [{ label: 'બંધ', value: 1 }]); });
    });
  }
  function goLine(id) {
    lineId = id; try { localStorage.setItem(LS_LINE, id); } catch (e) { /* ignore */ }
    closeDrawer();
    if (location.hash === '#line/' + encodeURIComponent(id)) renderLine(); else location.hash = '#line/' + encodeURIComponent(id);
    window.scrollTo({ top: $('#v-line').offsetTop - 120, behavior: 'smooth' });
  }
  BF.picker($('#lineQ'), { model: function () { return M; }, onPick: function (p) { goLine(p.id); } });

  /* ---------------- પરિવાર ---------------- */
  function renderFam() {
    var list = M.ordered().filter(function (p) { return p.gender !== 'f' && M.kids(p.id).length; });
    if (famFilter === 'info') list = list.filter(function (p) { return M.daughters(p.id).length || (p.fatherId && M.daughters(p.fatherId).length); });
    $('#famBody').innerHTML = list.length ? list.map(function (p, i) {
      var f = M.father(p.id), gf = f ? M.father(f.id) : null;
      var sis = f ? M.daughters(f.id) : [];
      return '<section class="family card"><h3><button type="button" data-open="' + p.id + '">' + label(p) + '</button></h3>' +
        '<p class="sub">' + (f ? 'પિતા: ' + esc(f.name) + (gf ? ' · દાદા: ' + esc(gf.name) : '') : 'મૂળ') + ' · પેઢી ' + M.gen(p.id) + '</p>' +
        '<div class="krow sis"><b>બહેન</b>' + chips(sis, 'sis') + '</div>' +
        '<div class="krow dau"><b>દિકરી</b>' + chips(M.daughters(p.id), 'dau') + '</div>' +
        '<div class="krow son"><b>દિકરા</b>' + chips(M.sons(p.id), 'son') + '</div>' +
      '</section>';
    }).join('') : '<p class="loading">કોઈ પરિવાર નથી.</p>';
  }
  $('#famFilter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]'); if (!b) return;
    famFilter = b.dataset.f;
    this.querySelectorAll('[data-f]').forEach(function (x) { x.classList.toggle('on', x === b); });
    renderFam();
  });

  /* ---------------- વિગત પેનલ ---------------- */
  function openDrawer(id) {
    var p = M.get(id); if (!p) return;
    drawerId = id;
    var ch = M.chain(id); ch.pop();
    var f = M.father(id), sib = M.siblings(id);
    var bros = sib.filter(function (x) { return x.gender !== 'f'; }), sis = sib.filter(function (x) { return x.gender === 'f'; });
    var sons = M.sons(id), ds = M.daughters(id), desc = M.descCount(id);
    function row(cls, title, list, chipCls) { return list.length ? '<div class="krow ' + cls + '"><b>' + title + '</b>' + chips(list, chipCls) + '</div>' : ''; }
    var html =
      '<div class="scrim" data-close></div>' +
      '<aside class="drawer" role="dialog" aria-modal="true" aria-label="' + esc(p.name) + '">' +
        '<div class="drawer-head">' +
          '<button class="icon-btn close" type="button" data-close aria-label="બંધ કરો">✕</button>' +
          '<h2>' + label(p) + '</h2>' +
          '<div class="meta"><span class="badge">પેઢી ' + M.gen(id) + '</span>' +
            '<span class="badge' + (p.gender === 'f' ? ' dau' : '') + '">' + (p.gender === 'f' ? 'દિકરી' : 'દિકરો') + '</span>' +
            (desc ? '<span class="badge">વંશજ: ' + desc + '</span>' : '') +
            (p.uncertain ? '<span class="badge" style="color:var(--check)">ચકાસવાનું બાકી</span>' : '') + '</div>' +
        '</div>' +
        '<div class="drawer-body">' +
          (ch.length ? '<div class="crumbs">' + ch.map(function (x) { return '<button type="button" data-open="' + x.id + '">' + esc(x.name) + '</button>'; }).join('<span class="sep">›</span>') + '</div>' : '') +
          (p.note ? '<div class="note-box">📍 ' + esc(p.note) + '</div>' : '') +
          (f ? '<div class="krow"><b>પિતા</b>' + chips([f], 'son') + '</div>' : '') +
          row('bro', 'ભાઈ', bros, '') + row('sis', 'બહેન', sis, 'sis') +
          row('son', 'દિકરા', sons, 'son') + row('dau', 'દિકરી', ds, 'dau') +
          (!f && !sib.length && !sons.length && !ds.length ? '<p class="muted">બીજી માહિતી નથી.</p>' : '') +
          '<div class="actions">' +
            '<button class="btn primary" type="button" data-line="' + id + '">વંશાવળી જુઓ</button>' +
            '<button class="btn" type="button" data-intree="' + id + '">વૃક્ષ માં બતાવો</button>' +
          '</div>' +
        '</div>' +
      '</aside>';
    var host = $('#drawerHost');
    var keep = host.querySelector('.drawer');
    host.innerHTML = html;
    if (keep) { host.querySelector('.drawer').style.animation = 'none'; host.querySelector('.scrim').style.animation = 'none'; }
    host.querySelector('.drawer .close').focus({ preventScroll: true });
  }
  function closeDrawer() { drawerId = null; $('#drawerHost').innerHTML = ''; }
  $('#drawerHost').addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeDrawer(); return; }
    var l = e.target.closest('[data-line]'); if (l) { goLine(l.dataset.line); return; }
    var t = e.target.closest('[data-intree]'); if (t) { showInTree(t.dataset.intree); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawerId) closeDrawer(); });

  /* ---------------- ઉપર ની શોધ ---------------- */
  BF.picker($('#q'), { model: function () { return M; }, onPick: function (p) { openDrawer(p.id); } });

  /* ---------------- ઉપર જાઓ ---------------- */
  var totop = $('#totop');
  window.addEventListener('scroll', function () { totop.classList.toggle('show', window.scrollY > 600); }, { passive: true });
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})(window.BF);
