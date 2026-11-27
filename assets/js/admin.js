/* =========================================================
   admin.js — નામ ઉમેરો / બદલો / કાઢો
   ========================================================= */
(function (BF) {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = BF.esc, label = BF.label;
  var M = null, selId = null, dirty = false, pendingFather = null, started = false;
  var navOpen = new Set();

  function show(id) { ['authScreen', 'denied', 'boot', 'app'].forEach(function (x) { $('#' + x).hidden = x !== id; }); }
  function fail(e) {
    var msg = e && e.code === 'permission-denied' ? 'પરવાનગી નથી — firestore.rules અને admins તપાસો' : (e && e.message) || String(e);
    BF.toast(msg, true);
  }

  /* ---------------- લૉગિન ---------------- */
  BF.auth.onChange(function (user) {
    if (!user) { show('authScreen'); return; }
    BF.auth.isAdmin(user).then(function (ok) {
      if (!ok) { $('#myUid').textContent = user.uid; show('denied'); return; }
      $('#who').textContent = user.email || '';
      show('app'); start();
    });
  });
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = '';
    BF.auth.signIn($('#email').value.trim(), $('#pw').value).catch(function (err) {
      var c = err && err.code || '';
      $('#loginErr').textContent = /invalid|wrong|not-found|credential/.test(c) ? 'ઇમેઇલ અથવા પાસવર્ડ ખોટો છે' :
        /too-many/.test(c) ? 'ઘણા પ્રયત્નો થયા — થોડી વાર પછી પ્રયત્ન કરો' : (err.message || c);
    }).then(function () { btn.disabled = false; });
  });
  $('#forgot').addEventListener('click', function () {
    var em = $('#email').value.trim();
    if (!em) { $('#loginErr').textContent = 'પહેલા ઇમેઇલ લખો'; return; }
    BF.auth.reset(em).then(function () { BF.toast('પાસવર્ડ બદલવા ની લિંક ઇમેઇલ પર મોકલી'); }, function (e) { $('#loginErr').textContent = e.message; });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) {
      if (dirty && !window.confirm('ફેરફાર સચવાયા નથી. તો પણ લૉગઆઉટ કરવું?')) return;
      dirty = false; BF.auth.signOut().then(function () { if (BF.mode === 'demo') location.href = 'index.html'; });
    }
  });

  /* ---------------- શરૂઆત ---------------- */
  function start() {
    if (started) return; started = true;
    var live = BF.mode === 'firebase';
    $('#mode').textContent = live ? 'Firebase' : 'ડેમો';
    $('#mode').classList.toggle('live', live);
    $('#resetDemo').hidden = live;
    BF.store.watch(function (list) {
      var first = !M;
      M = BF.model(list);
      if (first) M.roots().forEach(function (r) { var c = r; navOpen.add(c.id); while (M.sons(c.id).length === 1) { c = M.sons(c.id)[0]; navOpen.add(c.id); } navOpen.add(c.id); });
      if (selId && !M.get(selId)) { selId = null; dirty = false; }
      renderNav(); renderEditor(false);
    }, fail);
  }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- ડાબી યાદી ---------------- */
  function nnode(p) {
    var kids = M.kids(p.id), open = navOpen.has(p.id);
    return '<li data-id="' + p.id + '"' + (kids.length && !open ? ' class="closed"' : '') + '>' +
      '<div class="r' + (p.id === selId ? ' sel' : '') + '">' +
        (kids.length ? '<button class="tg" type="button" data-tg aria-label="ખોલો / બંધ">▼</button>' : '<span class="sp"></span>') +
        '<button class="nb' + (p.gender === 'f' ? ' f' : '') + '" type="button" data-sel="' + p.id + '">' + label(p) + '</button>' +
        (kids.length ? '<span class="badge">' + kids.length + '</span>' : '') +
      '</div>' +
      (kids.length && open ? '<ul' + (kids.length === 1 && M.sons(p.id).length === 1 ? ' class="flat"' : '') + '>' + kids.map(nnode).join('') + '</ul>' : '') +
    '</li>';
  }
  function renderNav() {
    var males = M.list.filter(function (p) { return p.gender !== 'f'; }).length;
    $('#navInfo').textContent = 'કુલ ' + M.list.length + ' નામ · ' + males + ' દિકરા · ' + (M.list.length - males) + ' દિકરી';
    var roots = M.roots();
    $('#navTree').innerHTML = roots.length ? '<ul class="ntree">' + roots.map(nnode).join('') + '</ul>' :
      '<p class="muted small" style="padding:12px">હજુ કોઈ નામ નથી. "⋯ સાધનો" માંથી શરૂઆત નો ડેટા નાખો અથવા નવી મૂળ વ્યક્તિ ઉમેરો.</p>';
  }
  $('#navTree').addEventListener('click', function (e) {
    var t = e.target.closest('[data-tg]');
    if (t) { var id = t.closest('li').dataset.id; if (navOpen.has(id)) navOpen.delete(id); else navOpen.add(id); renderNav(); return; }
    var s = e.target.closest('[data-sel]'); if (s) select(s.dataset.sel);
  });
  var navPick = BF.picker($('#navQ'), {
    model: function () { return M; }, inline: true, limit: 60,
    onPick: function (p) { $('#navTree').hidden = false; select(p.id); }
  });
  $('#navQ').addEventListener('input', function () { $('#navTree').hidden = !!this.value.trim(); });

  function select(id, force) {
    if (!force && dirty && id !== selId && !window.confirm('આ નામ ના ફેરફાર સચવાયા નથી. છોડી દેવા?')) return;
    selId = id; dirty = false;
    if (id) M.chain(id).forEach(function (x) { if (x.id !== id) navOpen.add(x.id); });
    renderNav(); renderEditor(true);
    document.body.classList.toggle('show-editor', !!id);
    $('#editor').scrollTop = 0; if (window.innerWidth <= 900) window.scrollTo(0, 0);
    var sel = $('#navTree .r.sel'); if (sel && window.innerWidth > 900) sel.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------- જમણી બાજુ: એડિટર ---------------- */
  function renderEditor(full) {
    var ed = $('#editor');
    var p = selId && M.get(selId);
    if (!p) { ed.innerHTML = welcome(); return; }
    if (full || !dirty || !$('#edForm')) {
      ed.innerHTML = '<div class="ed-wrap"><div id="edHead"></div><form class="sec card" id="edForm" autocomplete="off"></form><div id="edKids"></div></div>';
      pendingFather = p.fatherId || null;
      renderForm(p);
    }
    renderHead(p); renderKids(p);
  }

  function welcome() {
    var males = M.list.filter(function (p) { return p.gender !== 'f'; }).length;
    return '<div class="ed-wrap"><div class="welcome card">' +
      '<h2>નમસ્તે 🙏</h2><p class="muted">અહીં થી પરિવાર ના નામ ઉમેરો અને સુધારો. ફેરફાર તરત જ વ્યૂ પેજ પર દેખાશે.</p>' +
      '<div class="stats"><div class="stat card"><b>' + M.list.length + '</b><span>કુલ નામ</span></div>' +
      '<div class="stat card"><b>' + males + '</b><span>દિકરા</span></div>' +
      '<div class="stat card"><b>' + (M.list.length - males) + '</b><span>દિકરી</span></div>' +
      '<div class="stat card"><b>' + M.maxGen() + '</b><span>પેઢી</span></div></div>' +
      (M.list.length ? '' : '<p style="margin-top:18px"><button class="btn primary" type="button" data-tool="seed">🌱 શરૂઆત નો ડેટા નાખો</button></p>') +
      '<ol class="steps">' +
        '<li><span>ડાબી બાજુ ના ઝાડ માંથી અથવા શોધ થી નામ પસંદ કરો.</span></li>' +
        '<li><span>નામ, ઉપનામ, નોંધ બદલી ને <b>સાચવો</b> દબાવો.</span></li>' +
        '<li><span>નીચે <b>દિકરા / દિકરી ઉમેરો</b> માં એક લીટી માં એક નામ લખી એક સાથે ઘણા નામ ઉમેરો.</span></li>' +
        '<li><span>ક્રમ બદલવા ↑ ↓ વાપરો. બેકઅપ માટે "⋯ સાધનો" જુઓ.</span></li>' +
      '</ol></div></div>';
  }

  function renderHead(p) {
    var ch = M.chain(p.id); ch.pop();
    $('#edHead').innerHTML =
      '<div class="ed-head"><button class="btn sm back" type="button" id="back">← યાદી</button>' +
      '<h2>' + label(p) + '</h2><span class="badge">પેઢી ' + M.gen(p.id) + '</span>' +
      '<span class="badge' + (p.gender === 'f' ? ' dau' : '') + '">' + (p.gender === 'f' ? 'દિકરી' : 'દિકરો') + '</span></div>' +
      (ch.length ? '<div class="crumbs" style="margin-top:4px">' + ch.map(function (x) { return '<button type="button" data-sel="' + x.id + '">' + esc(x.name) + '</button>'; }).join('<span class="sep">›</span>') + '</div>' : '');
  }

  function fatherBox() {
    var f = pendingFather && M.get(pendingFather);
    return f ? '<b>' + label(f) + '</b><span class="muted small">' + esc(M.context(f.id, 2) ? '← ' + M.context(f.id, 2) : '') + '</span>' :
      '<b>— મૂળ વ્યક્તિ (પિતા નથી)</b>';
  }

  function renderForm(p) {
    var form = $('#edForm');
    form.innerHTML =
      '<h3 style="margin:0 0 12px;font-size:1.05rem">માહિતી</h3>' +
      '<div class="grid2">' +
        '<label class="field"><span>નામ *</span><input class="input" name="name" required maxlength="80" value="' + esc(p.name) + '"></label>' +
        '<label class="field"><span>ઉપનામ (હોય તો)</span><input class="input" name="alias" maxlength="80" value="' + esc(p.alias || '') + '" placeholder="દા.ત. કાનો"></label>' +
        '<div class="field"><span>દિકરો / દિકરી</span><div class="seg">' +
          '<label><input type="radio" name="gender" value="m"' + (p.gender !== 'f' ? ' checked' : '') + '><span>દિકરો</span></label>' +
          '<label><input type="radio" name="gender" value="f"' + (p.gender === 'f' ? ' checked' : '') + '><span>દિકરી</span></label></div></div>' +
        '<div class="field"><span>પિતા</span><div class="father-box" id="fbox">' + fatherBox() +
          '<button class="btn sm" type="button" id="chgFather" style="margin-left:auto">બદલો</button></div></div>' +
        '<label class="field span2"><span>નોંધ (ગામ, વિગત વગેરે)</span><input class="input" name="note" maxlength="300" value="' + esc(p.note || '') + '" placeholder="દા.ત. સાગપર થી બપાડા રહેવા આવેલા"></label>' +
        '<div class="span2" style="display:flex;gap:18px;flex-wrap:wrap">' +
          '<label class="check-row"><input type="checkbox" name="uncertain"' + (p.uncertain ? ' checked' : '') + '> નામ ચકાસવાનું બાકી</label>' +
          '<label class="check-row"><input type="checkbox" name="pinned"' + (p.pinned ? ' checked' : '') + '> વંશાવળી માં મુખ્ય તરીકે બતાવો</label>' +
        '</div>' +
      '</div>' +
      '<div class="form-actions"><button class="btn primary" type="submit" id="saveBtn">સાચવો</button>' +
        '<span class="dirty-dot" id="dirtyDot" hidden>● ફેરફાર સચવાયા નથી</span><span class="grow"></span>' +
        '<button class="btn danger" type="button" id="delBtn">કાઢી નાખો</button></div>';
  }

  function setDirty(v) { dirty = v; var d = $('#dirtyDot'); if (d) d.hidden = !v; }

  $('#editor').addEventListener('input', function (e) { if (e.target.closest('#edForm')) setDirty(true); });
  $('#editor').addEventListener('change', function (e) { if (e.target.closest('#edForm')) setDirty(true); });

  $('#editor').addEventListener('submit', function (e) {
    if (e.target.id !== 'edForm') return;
    e.preventDefault(); save();
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && $('#edForm')) { e.preventDefault(); save(); }
  });

  function save() {
    var p = M.get(selId), form = $('#edForm'); if (!p || !form) return;
    var f = form.elements;
    var name = f['name'].value.trim();
    if (!name) { BF.toast('નામ લખવું જરૂરી છે', true); f['name'].focus(); return; }
    var data = {
      name: name, alias: f['alias'].value.trim(), gender: form.querySelector('[name=gender]:checked').value,
      note: f['note'].value.trim(), uncertain: f['uncertain'].checked, pinned: f['pinned'].checked, fatherId: pendingFather || null
    };
    if (data.gender === 'f' && M.kids(selId).length) { BF.toast('આ વ્યક્તિ ના દિકરા/દિકરી છે — એને દિકરી તરીકે બદલી ન શકાય', true); return; }
    if ((p.fatherId || null) !== data.fatherId) data.order = nextOrder(data.fatherId);
    var btn = $('#saveBtn'); btn.disabled = true;
    var ops = [BF.store.update(selId, data)];
    if (data.pinned && !p.pinned) {
      M.list.forEach(function (x) { if (x.pinned && x.id !== selId) ops.push(BF.store.update(x.id, { pinned: false })); });
    }
    Promise.all(ops).then(function () { setDirty(false); BF.toast('સચવાઈ ગયું ✓'); renderEditor(true); }, fail)
      .then(function () { var b = $('#saveBtn'); if (b) b.disabled = false; });
  }

  function nextOrder(fatherId) {
    var arr = fatherId ? M.kids(fatherId) : M.roots();
    return arr.reduce(function (mx, x) { return Math.max(mx, x.order || 0); }, 0) + 10;
  }

  /* પિતા બદલો */
  function pickPerson(title, filter, allowRoot) {
    var btns = [{ label: 'રદ કરો', value: null }];
    if (allowRoot) btns.push({ label: 'પિતા વગર (મૂળ)', value: '__root' });
    return BF.modal('<h3>' + esc(title) + '</h3><div class="picker"><span class="ico">🔍</span><input class="input" type="search" placeholder="નામ લખો…" autocomplete="off"></div>',
      btns, function (box, close) {
        BF.picker(box.querySelector('input'), { model: function () { return M; }, inline: true, filter: filter, onPick: function (x) { close(x.id); } });
      });
  }
  $('#editor').addEventListener('click', function (e) {
    if (e.target.closest('#back')) { document.body.classList.remove('show-editor'); return; }
    var s = e.target.closest('[data-sel]'); if (s) { select(s.dataset.sel); return; }
    if (e.target.closest('#chgFather')) {
      pickPerson('નવા પિતા પસંદ કરો', function (x) { return x.gender !== 'f' && x.id !== selId && !M.isDescendant(x.id, selId); }, true)
        .then(function (v) { if (!v) return; pendingFather = v === '__root' ? null : v; $('#fbox').innerHTML = fatherBox() + '<button class="btn sm" type="button" id="chgFather" style="margin-left:auto">બદલો</button>'; setDirty(true); });
      return;
    }
    if (e.target.closest('#delBtn')) { del(); return; }
    var mv = e.target.closest('[data-move]'); if (mv) { move(mv.dataset.id, +mv.dataset.move); return; }
    var add = e.target.closest('[data-add]'); if (add) { addKids(add.dataset.add); return; }
  });

  function del() {
    var p = M.get(selId); if (!p) return;
    var n = M.kids(p.id).length;
    if (n) { BF.toast('પહેલા ' + n + ' દિકરા/દિકરી કાઢો અથવા બીજા પિતા હેઠળ ખસેડો', true); return; }
    BF.confirm('"' + p.name + '" કાઢી નાખવું છે?', 'આ પાછું નહીં આવે.', 'હા, કાઢી નાખો', true).then(function (ok) {
      if (!ok) return;
      var back = p.fatherId || null;
      BF.store.remove(p.id).then(function () { BF.toast('કાઢી નાખ્યું'); dirty = false; select(back, true); }, fail);
    });
  }

  /* દિકરા / દિકરી */
  function renderKids(p) {
    var box = $('#edKids');
    if (p.gender === 'f') { box.innerHTML = '<p class="muted small" style="text-align:center">દિકરી ના સંતાન આ વંશ માં ઉમેરાતા નથી.</p>'; return; }
    box.innerHTML = kidSec(p, 'm') + '<div style="height:16px"></div>' + kidSec(p, 'f');
  }
  function kidSec(p, g) {
    var list = g === 'm' ? M.sons(p.id) : M.daughters(p.id);
    var t = g === 'm' ? 'દિકરા' : 'દિકરી';
    return '<section class="sec card ' + (g === 'm' ? 'son-sec' : 'dau-sec') + '"><h3>' + t + ' <span class="badge">' + list.length + '</span></h3>' +
      (list.length ? '<ol class="klist">' + list.map(function (k, i) {
        var n = M.kids(k.id).length;
        return '<li><span class="idx">' + (i + 1) + '.</span><button class="k" type="button" data-sel="' + k.id + '">' + label(k) + '</button>' +
          (n ? '<span class="badge">' + n + '</span>' : '') +
          '<button class="icon-btn" type="button" data-move="-1" data-id="' + k.id + '" aria-label="ઉપર"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="icon-btn" type="button" data-move="1" data-id="' + k.id + '" aria-label="નીચે"' + (i === list.length - 1 ? ' disabled' : '') + '>↓</button></li>';
      }).join('') + '</ol>' : '<p class="muted small" style="margin:0 0 10px">હજુ કોઈ ' + t + ' ઉમેર્યા નથી.</p>') +
      '<div class="add-box"><textarea class="input" id="add-' + g + '" rows="3" placeholder="' + t + ' ના નામ — એક લીટી માં એક નામ&#10;દા.ત.&#10;' + (g === 'm' ? 'રમેશભાઈ&#10;સુરેશભાઈ (સુરો)' : 'ગીતાબેન&#10;સીમા') + '"></textarea>' +
      '<div class="row"><button class="btn primary sm" type="button" data-add="' + g + '">+ ' + t + ' ઉમેરો</button>' +
      '<span class="muted small">કૌંસ માં ઉપનામ લખી શકાય</span></div></div></section>';
  }

  function addKids(g) {
    var ta = $('#add-' + g); if (!ta) return;
    var names = ta.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!names.length) { ta.focus(); BF.toast('ઓછા માં ઓછું એક નામ લખો', true); return; }
    var ord = nextOrder(selId);
    var list = names.map(function (line, i) {
      var am = line.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      return { name: (am ? am[1] : line).trim(), alias: am ? am[2].trim() : '', gender: g, fatherId: selId, order: ord + i * 10, note: '', uncertain: false, pinned: false };
    }).filter(function (x) { return x.name; });
    navOpen.add(selId);
    BF.store.addMany(list).then(function () { ta.value = ''; BF.toast(list.length + ' નામ ઉમેરાયા ✓'); }, fail);
  }

  function move(id, dir) {
    var k = M.get(id); if (!k) return;
    var list = (k.gender === 'f' ? M.daughters(k.fatherId) : M.sons(k.fatherId)).slice();
    var i = list.findIndex(function (x) { return x.id === id; }), j = i + dir;
    if (j < 0 || j >= list.length) return;
    var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    var ups = [];
    list.forEach(function (x, n) { var o = (n + 1) * 10; if (x.order !== o) ups.push({ id: x.id, data: { order: o } }); });
    BF.store.updateMany(ups).catch(fail);
  }

  /* ---------------- સાધનો મેનુ ---------------- */
  var menuBtn = $('#menuBtn'), menuList = $('#menuList');
  menuBtn.addEventListener('click', function (e) { e.stopPropagation(); menuList.hidden = !menuList.hidden; menuBtn.setAttribute('aria-expanded', String(!menuList.hidden)); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.menu')) { menuList.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tool]'); if (!t || !M) return;
    menuList.hidden = true;
    var tool = t.dataset.tool;
    if (tool === 'root') addRoot();
    if (tool === 'export') exportJson();
    if (tool === 'import') $('#fileIn').click();
    if (tool === 'seed') seed();
    if (tool === 'reset') BF.confirm('ડેમો ડેટા ફરી થી?', 'આ બ્રાઉઝર માં કરેલા બધા ફેરફાર જતા રહેશે.', 'હા', true).then(function (ok) {
      if (ok) BF.store.resetDemo().then(function () { selId = null; dirty = false; BF.toast('ડેમો ડેટા ફરી થી લોડ થયો'); });
    });
  });

  function addRoot() {
    BF.modal('<h3>નવી મૂળ વ્યક્તિ</h3><p class="muted small" style="margin:0 0 10px">જેના પિતા ની માહિતી નથી એવી વ્યક્તિ. (સામાન્ય રીતે કોઈ ના દિકરા તરીકે ઉમેરવું સારું.)</p>' +
      '<label class="field"><span>નામ</span><input class="input" id="rootName" maxlength="80"></label>',
      [{ label: 'રદ કરો', value: null }, { label: 'ઉમેરો', cls: 'primary', value: function (box) { return box.querySelector('#rootName').value.trim(); } }])
      .then(function (name) {
        if (!name) return;
        BF.store.add({ name: name, alias: '', gender: 'm', fatherId: null, order: nextOrder(null), note: '', uncertain: false, pinned: false })
          .then(function (id) { BF.toast('ઉમેરાયું ✓'); setTimeout(function () { select(id, true); }, 300); }, fail);
      });
  }

  function exportJson() {
    var data = { app: 'balar-family', version: 1, exportedAt: new Date().toISOString(),
      people: M.ordered().map(function (p) { return { id: p.id, name: p.name, alias: p.alias || '', gender: p.gender || 'm', fatherId: p.fatherId || null, order: p.order || 0, note: p.note || '', uncertain: !!p.uncertain, pinned: !!p.pinned }; }) };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'balar-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    BF.toast('બેકઅપ ડાઉનલોડ થયો (' + data.people.length + ' નામ)');
  }

  $('#fileIn').addEventListener('change', function () {
    var file = this.files[0]; this.value = ''; if (!file) return;
    file.text().then(function (txt) {
      var data = JSON.parse(txt), list = data && data.people;
      if (!Array.isArray(list) || !list.every(function (p) { return p && p.id && p.name; })) throw new Error('ફાઇલ બરાબર નથી');
      var exist = list.filter(function (p) { return M.get(p.id); }).length;
      return BF.confirm('બેકઅપ માંથી ' + list.length + ' નામ ઉમેરવા?', exist ? exist + ' નામ પહેલે થી છે — એ બેકઅપ પ્રમાણે બદલાઈ જશે. બાકી ના ડેટાબેઝ ના નામ એમ જ રહેશે.' : 'બધા નવા નામ ઉમેરાશે.', 'હા, ઉમેરો')
        .then(function (ok) { if (ok) return BF.store.addMany(list).then(function () { BF.toast(list.length + ' નામ ઉમેરાયા ✓'); }); });
    }).catch(fail);
  });

  function seed() {
    var go = function () {
      var list = BF.parseSeed(BF.SEED_TEXT, BF.store.newId);
      return BF.store.addMany(list).then(function () { BF.toast(list.length + ' નામ ઉમેરાયા ✓'); });
    };
    var msg = M.list.length ? 'ડેટાબેઝ માં પહેલે થી ' + M.list.length + ' નામ છે — ફરી નાખશો તો બધા નામ બે વાર થશે.' : 'ચિત્ર 4, 5, 6, 7 અને જૂના પેજ ના બધા નામ ડેટાબેઝ માં ઉમેરાશે.';
    BF.confirm('શરૂઆત નો ડેટા નાખવો?', msg, 'હા, નાખો', !!M.list.length).then(function (ok) { if (ok) go().catch(fail); });
  }
})(window.BF);
