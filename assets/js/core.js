/* =========================================================
   core.js — ડેટાબેઝ, લૉગિન, પરિવાર ગણતરી અને નાના UI સાધનો
   વ્યૂ અને એડમિન બંને આ ફાઇલ વાપરે છે.
   ========================================================= */
window.BF = window.BF || {};
(function (BF) {
  'use strict';

  var cfg = window.FIREBASE_CONFIG || {};
  var configured = !!(cfg.apiKey && cfg.projectId && !/YOUR_/.test(cfg.apiKey + cfg.projectId) && window.firebase);
  BF.mode = configured ? 'firebase' : 'demo';

  var COL = 'people';
  var FIELDS = ['name', 'alias', 'gender', 'fatherId', 'order', 'note', 'uncertain', 'pinned'];
  var db = null, auth = null;
  if (configured) {
    firebase.initializeApp(cfg);
    db = firebase.firestore();
    if (firebase.auth) auth = firebase.auth();
  }

  function clean(d) {
    var o = {};
    FIELDS.forEach(function (k) { if (d[k] !== undefined) o[k] = d[k]; });
    if (o.name !== undefined) o.name = String(o.name).trim();
    if (o.alias !== undefined) o.alias = String(o.alias || '').trim();
    if (o.note !== undefined) o.note = String(o.note || '').trim();
    if (o.fatherId === undefined && d.hasOwnProperty('fatherId')) o.fatherId = null;
    return o;
  }
  function rid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------- ડેમો સ્ટોર (બ્રાઉઝર માં) ---------------- */
  var KEY = 'balar-demo-people-v1';
  var demo = null, demoSubs = [];
  function demoLoad() {
    if (demo) return demo;
    try { var s = localStorage.getItem(KEY); if (s) { demo = JSON.parse(s); return demo; } } catch (e) { /* ખાનગી મોડ */ }
    demo = BF.parseSeed(BF.SEED_TEXT, rid);
    demoSave();
    return demo;
  }
  function demoSave() { try { localStorage.setItem(KEY, JSON.stringify(demo)); } catch (e) { /* ignore */ } }
  function demoEmit() { demoSave(); var c = demo.map(function (p) { return Object.assign({}, p); }); demoSubs.forEach(function (f) { f(c); }); }

  /* ---------------- સ્ટોર API ---------------- */
  BF.store = {
    newId: function () { return configured ? db.collection(COL).doc().id : rid(); },

    watch: function (cb, onErr) {
      if (configured) {
        return db.collection(COL).onSnapshot(function (snap) {
          cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
        }, function (e) { if (onErr) onErr(e); });
      }
      demoLoad(); demoSubs.push(cb);
      setTimeout(function () { cb(demo.map(function (p) { return Object.assign({}, p); })); }, 0);
      window.addEventListener('storage', function (e) { if (e.key === KEY) { demo = null; demoLoad(); demoEmit(); } });
      return function () { demoSubs = demoSubs.filter(function (f) { return f !== cb; }); };
    },

    add: function (d) {
      var data = clean(d);
      if (configured) {
        var ts = firebase.firestore.FieldValue.serverTimestamp();
        data.createdAt = ts; data.updatedAt = ts;
        return db.collection(COL).add(data).then(function (r) { return r.id; });
      }
      var id = rid(); demo.push(Object.assign({ id: id }, data)); demoEmit();
      return Promise.resolve(id);
    },

    /* list = [{id?, ...data}] — એક સાથે ઘણા (batch) */
    addMany: function (list) {
      if (configured) {
        var ts = firebase.firestore.FieldValue.serverTimestamp();
        var chunks = [];
        for (var i = 0; i < list.length; i += 400) chunks.push(list.slice(i, i + 400));
        return chunks.reduce(function (pr, chunk) {
          return pr.then(function () {
            var b = db.batch();
            chunk.forEach(function (d) {
              var ref = d.id ? db.collection(COL).doc(d.id) : db.collection(COL).doc();
              b.set(ref, Object.assign(clean(d), { createdAt: ts, updatedAt: ts }));
            });
            return b.commit();
          });
        }, Promise.resolve());
      }
      list.forEach(function (d) {
        var id = d.id || rid();
        demo = demo.filter(function (x) { return x.id !== id; });
        demo.push(Object.assign({ id: id }, clean(d)));
      });
      demoEmit();
      return Promise.resolve();
    },

    update: function (id, d) {
      var data = clean(d);
      if (configured) {
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        return db.collection(COL).doc(id).update(data);
      }
      var p = demo.find(function (x) { return x.id === id; });
      if (p) Object.assign(p, data);
      demoEmit();
      return Promise.resolve();
    },

    /* updates = [{id, data}] */
    updateMany: function (updates) {
      if (configured) {
        var b = db.batch(), ts = firebase.firestore.FieldValue.serverTimestamp();
        updates.forEach(function (u) { b.update(db.collection(COL).doc(u.id), Object.assign(clean(u.data), { updatedAt: ts })); });
        return b.commit();
      }
      updates.forEach(function (u) { var p = demo.find(function (x) { return x.id === u.id; }); if (p) Object.assign(p, clean(u.data)); });
      demoEmit();
      return Promise.resolve();
    },

    remove: function (id) {
      if (configured) return db.collection(COL).doc(id).delete();
      demo = demo.filter(function (x) { return x.id !== id; }); demoEmit();
      return Promise.resolve();
    },

    resetDemo: function () {
      if (configured) return Promise.reject(new Error('demo only'));
      demo = BF.parseSeed(BF.SEED_TEXT, rid); demoEmit();
      return Promise.resolve();
    }
  };

  /* ---------------- લૉગિન ---------------- */
  BF.auth = {
    onChange: function (cb) {
      if (!configured) { setTimeout(function () { cb({ uid: 'demo', email: 'ડેમો એડમિન' }); }, 0); return; }
      auth.onAuthStateChanged(cb);
    },
    signIn: function (email, pw) { return configured ? auth.signInWithEmailAndPassword(email, pw) : Promise.resolve(); },
    signOut: function () { return configured ? auth.signOut() : Promise.resolve(); },
    reset: function (email) { return auth.sendPasswordResetEmail(email); },
    isAdmin: function (user) {
      if (!configured) return Promise.resolve(true);
      return db.collection('admins').doc(user.uid).get().then(function (s) { return s.exists; }, function () { return false; });
    }
  };

  /* ---------------- પરિવાર મોડેલ ---------------- */
  BF.norm = function (s) {
    return String(s || '').toLowerCase().replace(/\s+/g, '')
      .replace(/ઈ/g, 'ઇ').replace(/ઊ/g, 'ઉ').replace(/ી/g, 'િ').replace(/ૂ/g, 'ુ')
      .replace(/ભાઇ|ભાઈ/g, 'ભાઇ').replace(/[().\-]/g, '');
  };

  function byOrder(a, b) { return (a.order || 0) - (b.order || 0) || String(a.name).localeCompare(String(b.name), 'gu'); }

  BF.model = function (list) {
    var byId = {}, kids = {};
    list.forEach(function (p) { byId[p.id] = p; });
    list.forEach(function (p) {
      var f = p.fatherId && byId[p.fatherId] ? p.fatherId : '_root';
      (kids[f] = kids[f] || []).push(p);
    });
    Object.keys(kids).forEach(function (k) { kids[k].sort(byOrder); });

    var m = {
      list: list, byId: byId,
      get: function (id) { return byId[id] || null; },
      roots: function () { return (kids._root || []).filter(function (p) { return p.gender !== 'f'; }).concat((kids._root || []).filter(function (p) { return p.gender === 'f'; })); },
      kids: function (id) { return kids[id] || []; },
      sons: function (id) { return (kids[id] || []).filter(function (p) { return p.gender !== 'f'; }); },
      daughters: function (id) { return (kids[id] || []).filter(function (p) { return p.gender === 'f'; }); },
      father: function (id) { var p = byId[id]; return p && p.fatherId ? byId[p.fatherId] || null : null; },
      /* મૂળ થી આ વ્યક્તિ સુધી */
      chain: function (id) {
        var out = [], seen = {}, p = byId[id];
        while (p && !seen[p.id]) { seen[p.id] = 1; out.unshift(p); p = p.fatherId ? byId[p.fatherId] : null; }
        return out;
      },
      gen: function (id) { return m.chain(id).length; },
      siblings: function (id) {
        var p = byId[id]; if (!p) return [];
        var f = p.fatherId && byId[p.fatherId] ? p.fatherId : null;
        if (!f) return [];
        return (kids[f] || []).filter(function (x) { return x.id !== id; });
      },
      isDescendant: function (id, ofId) {
        var p = byId[id], seen = {};
        while (p && !seen[p.id]) { if (p.id === ofId) return true; seen[p.id] = 1; p = p.fatherId ? byId[p.fatherId] : null; }
        return false;
      },
      descCount: function (id) {
        var n = 0, st = [id], seen = {};
        while (st.length) { var c = st.pop(); if (seen[c]) continue; seen[c] = 1; (kids[c] || []).forEach(function (k) { n++; st.push(k.id); }); }
        return n;
      },
      /* ઝાડ ના ક્રમ માં બધા (DFS) */
      ordered: function () {
        var out = [], seen = {};
        (function walk(arr) { arr.forEach(function (p) { if (seen[p.id]) return; seen[p.id] = 1; out.push(p); walk(kids[p.id] || []); }); })(kids._root || []);
        return out;
      },
      maxGen: function () {
        var mx = 0;
        (function walk(arr, d) { arr.forEach(function (p) { if (d > mx) mx = d; if (d < 200) walk(kids[p.id] || [], d + 1); }); })(kids._root || [], 1);
        return mx;
      },
      /* "પિતા · દાદા" જેવું નાનું લખાણ */
      context: function (id, n) {
        var ch = m.chain(id); ch.pop();
        return ch.slice(-(n || 2)).reverse().map(function (p) { return p.name; }).join(' ← ');
      },
      search: function (q, limit) {
        var v = BF.norm(q); if (!v) return [];
        var res = [];
        m.ordered().forEach(function (p) {
          var a = BF.norm(p.name), b = BF.norm(p.alias);
          var score = a.indexOf(v) === 0 ? 0 : a.indexOf(v) !== -1 ? 1 : (b && b.indexOf(v) !== -1) ? 2 : -1;
          if (score >= 0) res.push({ p: p, s: score });
        });
        res.sort(function (x, y) { return x.s - y.s; });
        return res.slice(0, limit || 40).map(function (r) { return r.p; });
      }
    };
    return m;
  };

  /* ---------------- UI સાધનો ---------------- */
  BF.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  BF.label = function (p) {
    if (!p) return '';
    return '<span class="' + (p.uncertain ? 'unsure' : '') + '">' + BF.esc(p.name) + '</span>' +
      (p.alias ? ' <span class="alias">(' + BF.esc(p.alias) + ')</span>' : '');
  };

  BF.toast = function (msg, isErr) {
    var box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, isErr ? 6000 : 2600);
  };

  /* પોતાનું modal — html સ્ટ્રિંગ, બટનો [{label, value, cls}] */
  BF.modal = function (html, buttons, onOpen) {
    return new Promise(function (resolve) {
      var scrim = document.createElement('div'); scrim.className = 'scrim';
      var box = document.createElement('div'); box.className = 'modal card'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.innerHTML = html + '<div class="actions"></div>';
      var act = box.querySelector('.actions');
      function close(v) { scrim.remove(); box.remove(); document.removeEventListener('keydown', key); resolve(v); }
      function key(e) { if (e.key === 'Escape') close(null); }
      (buttons || []).forEach(function (b) {
        var el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
        el.addEventListener('click', function () { close(typeof b.value === 'function' ? b.value(box) : b.value); });
        act.appendChild(el);
      });
      if (!buttons || !buttons.length) act.remove();
      scrim.addEventListener('click', function () { close(null); });
      document.addEventListener('keydown', key);
      document.body.appendChild(scrim); document.body.appendChild(box);
      if (onOpen) onOpen(box, close);
      var f = box.querySelector('input,textarea,select,button'); if (f) f.focus();
    });
  };
  BF.confirm = function (title, msg, okLabel, danger) {
    return BF.modal('<h3>' + BF.esc(title) + '</h3><p class="muted" style="margin:0">' + msg + '</p>',
      [{ label: 'રદ કરો', value: false }, { label: okLabel || 'હા', value: true, cls: danger ? 'danger' : 'primary' }]);
  };

  /* નામ શોધ — input + પરિણામ યાદી. opts: {model(), onPick(p), filter(p), inline, limit} */
  BF.picker = function (input, opts) {
    var wrap = input.closest('.picker') || input.parentNode;
    var ul = document.createElement('ul'); ul.className = 'results card' + (opts.inline ? ' inline' : ''); ul.hidden = true;
    ul.setAttribute('role', 'listbox');
    if (opts.inline) wrap.after(ul); else wrap.appendChild(ul);
    var items = [], on = -1;
    function render() {
      var m = opts.model(); if (!m) return;
      var q = input.value.trim();
      if (!q) { ul.hidden = true; ul.innerHTML = ''; items = []; return; }
      items = m.search(q, opts.limit || 40).filter(opts.filter || function () { return true; });
      on = items.length ? 0 : -1;
      ul.innerHTML = items.length ? items.map(function (p, i) {
        var ctx = m.context(p.id, 3);
        return '<li role="option" data-i="' + i + '" class="' + (i === on ? 'on' : '') + '">' +
          '<span class="g ' + (p.gender === 'f' ? 'f' : 'm') + '">' + (p.gender === 'f' ? 'બે' : 'ભા') + '</span>' +
          '<span class="t"><b>' + BF.label(p) + '</b><small>' + (ctx ? 'પિતા: ' + BF.esc(ctx) : 'મૂળ') + ' · પેઢી ' + m.gen(p.id) + '</small></span></li>';
      }).join('') : '<li class="empty">કોઈ નામ ન મળ્યું</li>';
      ul.hidden = false;
    }
    function pick(i) {
      var p = items[i]; if (!p) return;
      input.value = ''; ul.hidden = true; ul.innerHTML = ''; items = [];
      opts.onPick(p);
    }
    function mark() { Array.prototype.forEach.call(ul.children, function (li, i) { li.classList.toggle('on', i === on); if (i === on) li.scrollIntoView({ block: 'nearest' }); }); }
    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value.trim()) render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { on = (on + 1) % items.length; mark(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { on = (on - 1 + items.length) % items.length; mark(); } }
      else if (e.key === 'Enter') { e.preventDefault(); if (on >= 0) pick(on); }
      else if (e.key === 'Escape') { if (!opts.inline) { ul.hidden = true; input.blur(); } }
    });
    ul.addEventListener('mousedown', function (e) { e.preventDefault(); });
    ul.addEventListener('click', function (e) { var li = e.target.closest('li[data-i]'); if (li) pick(+li.dataset.i); });
    if (!opts.inline) document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) ul.hidden = true; });
    return { refresh: render, el: ul };
  };
})(window.BF);
