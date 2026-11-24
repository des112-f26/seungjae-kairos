/* Kairos demo logic.
 * Makes the static prototype behave like an app: selections respond to taps,
 * the profile and D-day update live, recorded moments show up tonight, and
 * comments, board notes and reactions are kept. Everything is stored in this
 * browser only (localStorage), under keys that start with "kairos.".
 */
(function () {
  'use strict';

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('kairos.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('kairos.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: demo still works per page */ }
    },
    clear: function () {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('kairos.') === 0) localStorage.removeItem(k); });
      } catch (e) {}
    }
  };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var BRASS = '#b8963e', BORDER = '#9a9479', SAND = '#e6dfc8', INK = '#1f241a', GOLD = '#d4b26a';

  function bind(key, text) { $$('[data-bind="' + key + '"]').forEach(function (el) { el.textContent = text; }); }
  function bindWidth(key, pct) { $$('[data-bind-width="' + key + '"]').forEach(function (el) { el.style.width = pct + '%'; }); }
  function el(tag, style, text) { var e = document.createElement(tag); if (style) e.setAttribute('style', style); if (text != null) e.textContent = text; return e; }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function duration(mins) { var h = Math.floor(mins / 60), m = mins % 60; return (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m || !h ? m + ' min' : ''); }
  function feltLabel(v) { v = +v; return v < 25 ? 'a blink' : v < 50 ? 'a little while' : v < 75 ? 'a long while' : 'forever'; }
  function clock(d) { var h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM'); }
  function dayLabel(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase(); }
  function titleOf(text) { var t = (text || '').split(/[.!?\n]/)[0].trim(); if (!t) t = 'A moment'; return t.length > 42 ? t.slice(0, 40).trim() + '…' : t; }
  function shortName(n) { return n.replace(/^(Pvt\.|Cpl\.|Sgt\.|PFC)\s+/, ''); }

  /* ---------- profile & D-day ---------- */
  var PROFILE = { name: 'Seungjae Chang', rank: 'Pvt.', unit: '2nd squad', badge: '#4c5a2e', enlist: '2025-12-16', discharge: '2027-06-17', showD: true };
  function profile() { var p = store.get('profile', {}); var out = {}; for (var k in PROFILE) out[k] = (p[k] === undefined ? PROFILE[k] : p[k]); return out; }
  function saveProfile(patch) { var p = profile(); for (var k in patch) p[k] = patch[k]; store.set('profile', p); renderProfile(); }
  function service(p) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var end = new Date(p.discharge + 'T00:00:00'), start = new Date(p.enlist + 'T00:00:00');
    if (isNaN(end) || isNaN(start)) return null;
    var left = Math.round((end - t) / 864e5), total = Math.max(1, Math.round((end - start) / 864e5));
    var served = Math.max(0, Math.min(total, total - left));
    return { left: left, total: total, served: served, pct: Math.round(served / total * 100) };
  }
  function renderProfile() {
    var p = profile(), r = service(p);
    var dday = !r ? 'D-?' : r.left > 0 ? 'D-' + r.left : r.left === 0 ? 'D-DAY' : 'DONE';
    bind('dday', dday);
    if (r) { bind('served', r.served + ' of ' + r.total + ' days served'); bindWidth('servedPct', r.pct); }
    var parts = (p.name || '').trim().split(/\s+/).filter(Boolean);
    var last = parts.length ? parts[parts.length - 1] : '', first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    bind('tagName', ((last || 'NAME') + (first ? ', ' + first : '')).toUpperCase());
    bind('tagRank', (p.rank.replace('.', '') + ' · ' + (p.unit || 'unit')).toUpperCase());
    bind('tagDday', 'KAIROS · ' + (p.showD ? dday : 'D-DAY HIDDEN'));
    bind('initial', ((first || last || 'K').charAt(0)).toUpperCase());
    bind('shortName', ((first ? first.charAt(0) + '. ' : '') + (last || 'Name') + ' · ' + (p.unit || 'unit')).toUpperCase());
    var badge = $('#tagBadge'); if (badge) badge.style.background = p.badge;
    var tagd = $('#tagd'); if (tagd) tagd.textContent = p.showD ? dday : 'D-DAY HIDDEN';
    var box = $('#showd'), note = $('#dnote');
    if (box) box.checked = !!p.showD;
    if (note) note.style.display = p.showD ? 'none' : 'block';
    var f;
    if ((f = $('#pname')) && document.activeElement !== f) f.value = p.name;
    if ((f = $('#punit')) && document.activeElement !== f) f.value = p.unit;
    if ((f = $('#penlist'))) f.value = p.enlist;
    if ((f = $('#pdischarge'))) f.value = p.discharge;
  }

  /* ---------- draft moment ---------- */
  var DRAFT = { kind: 'My unit', text: "Late dinner with my squad after drills. We couldn't stop laughing.", who: ['Pvt. Kim', 'Cpl. Park', 'Pvt. Lee'], felt: 18, word: 'laughing', photo: null };
  function draft() { var d = store.get('draft', {}); var out = {}; for (var k in DRAFT) out[k] = (d[k] === undefined ? DRAFT[k] : d[k]); return out; }
  function saveDraft(patch) { var d = draft(); for (var k in patch) d[k] = patch[k]; store.set('draft', d); renderDraft(); }
  function renderDraft() {
    var d = draft();
    bind('who', d.who.length ? d.who.map(shortName).join(', ') : 'Nobody tagged');
    var kind = d.kind === 'My unit' ? 'Unit' : d.kind;
    bind('draftLabel', kind + ' · ' + titleOf(d.text).toLowerCase());
    bind('photoNote', d.photo != null ? '1 photo attached ✓' : 'Add a photo (optional)');
    var f;
    if ((f = $('#what')) && document.activeElement !== f) f.value = d.text;
    if ((f = $('#felt')) && document.activeElement !== f) f.value = d.felt;
    if ((f = $('#word')) && document.activeElement !== f) f.value = d.word;
    $$('input[name="who"]').forEach(function (c) { c.checked = d.who.indexOf(c.value) !== -1; styleCheckRow(c); });
  }
  function styleCheckRow(c) {
    var row = c.closest('label'); if (!row) return;
    row.style.borderColor = c.checked ? BRASS : BORDER;
    row.style.background = c.checked ? 'rgba(184,150,62,0.15)' : 'transparent';
  }

  /* ---------- saved moments ---------- */
  function moments() { return store.get('moments', []); }
  function todays() { var k = todayKey(); return moments().filter(function (m) { return m.day === k; }); }
  function keepMoment() {
    var d = draft(), now = new Date();
    var mins = [35, 48, 62, 85, 110, 140][Math.floor(Math.random() * 6)];
    var start = new Date(now.getTime() - mins * 6e4);
    var m = { id: 'm' + now.getTime(), day: todayKey(), title: titleOf(d.text), text: d.text, kind: d.kind, word: (d.word || '').trim() || '—',
      felt: +d.felt, who: d.who, photo: d.photo, start: start.toISOString(), end: now.toISOString(), mins: mins };
    var list = moments(); list.push(m); store.set('moments', list);
    store.set('current', m.id); store.set('draft', {});
  }
  function timeRange(m) { var a = new Date(m.start), b = new Date(m.end); return dayLabel(b) + ' · ' + clock(a) + ' – ' + clock(b); }
  function renderCounts() {
    var n = todays().length, quiet = store.get('quiet', '') === todayKey();
    bind('homePill', quiet ? 'Kairos is quiet for the rest of today' : 'You saved ' + plural(1 + n, 'moment') + ' today');
    bind('sealedCount', plural(1 + n, 'moment').toUpperCase() + ' INSIDE');
    bind('unsealCount', String(2 + n));
    bind('weekCount', plural(5 + moments().length, 'moment') + ' kept');
    var last = moments().slice(-1)[0];
    if (last) { bind('sealTitle', last.title + '.'); bind('sealWord', '“' + last.word + '”'); }
  }
  function renderTonight() {
    var list = $('#momentsList'); if (!list) return;
    var mine = todays(), total = 205;
    Array.prototype.forEach.call(list.children, function (c) { c.style.flexShrink = '0'; });
    mine.forEach(function (m) {
      total += m.mins;
      var a = el('a', 'display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 8px; background: rgba(184,150,62,0.16); box-shadow: inset 0 0 0 1px rgba(212,178,106,0.45); text-decoration: none; color: inherit');
      a.href = 'Detail.html#' + m.id;
      a.style.flexShrink = '0';
      a.appendChild(el('span', "font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500; letter-spacing: .06em; color: " + GOLD, timeRange(m) + ' · NEW'));
      a.appendChild(el('span', 'font-size: 16px; font-weight: 500', m.title));
      a.appendChild(el('span', "font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: rgba(230,223,200,0.85)", '“' + m.word + '” · felt like ' + feltLabel(m.felt) + ', was ' + duration(m.mins)));
      list.appendChild(a);
    });
    bind('totalAway', duration(total));
    if (mine.length) list.scrollTop = list.scrollHeight;
  }
  function renderDetail() {
    if (!$('[data-bind="dTitle"]')) return;
    var id = (location.hash || '').slice(1);
    var m = moments().filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var b = new Date(m.end), a = new Date(m.start);
    bind('dTime', dayLabel(b) + ' · ' + clock(a) + ' – ' + clock(b));
    bind('dTitle', m.title); bind('dWord', '“' + m.word + '”'); bind('dText', m.text);
    bind('dFeltT', feltLabel(m.felt)); bindWidth('dFeltW', Math.max(6, m.felt));
    bind('dActualT', duration(m.mins)); bindWidth('dActualW', Math.min(100, Math.round(m.mins / 150 * 100)));
    $$('[data-show="dPhoto"]').forEach(function (e) { e.style.display = m.photo != null ? '' : 'none'; });
  }

  /* ---------- selections (chips, rank, badge color, photos) ---------- */
  function paint(group, btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (group === 'badge') { btn.style.boxShadow = on ? '0 0 0 3px ' + SAND + ', 0 0 0 5px ' + INK : '0 0 0 1px ' + BORDER; return; }
    if (group === 'photo') { btn.style.border = on ? '3px solid ' + BRASS : '1px solid ' + BORDER; return; }
    btn.style.background = on ? BRASS : 'transparent';
    btn.style.borderColor = on ? BRASS : BORDER;
  }
  function selectionDefaults(group) {
    if (group === 'rank') return [profile().rank];
    if (group === 'badge') return [profile().badge];
    if (group === 'it-was') return [draft().kind];
    if (group === 'photo') { var p = draft().photo; return p == null ? [] : [String(p)]; }
    return null;
  }
  function onSelect(group, values) {
    if (group === 'rank') saveProfile({ rank: values[0] || 'Pvt.' });
    else if (group === 'badge') saveProfile({ badge: values[0] || '#4c5a2e' });
    else if (group === 'it-was') saveDraft({ kind: values[0] || 'Something else' });
    else if (group === 'photo') store.set('photoPick', values[0] == null ? null : +values[0]);
    else store.set('sel.' + group, values);
    renderAskAfter();
  }
  function renderAskAfter() {
    var v = store.get('sel.ask-me-after', null);
    if (!v) return;
    var short = { 'Time with your unit': 'Unit', 'A movie': 'Movie', 'Any long break': 'Long breaks' };
    bind('askAfter', v.length ? v.map(function (x) { return short[x] || x; }).join(', ') : 'Nothing yet');
  }
  function setupGroups() {
    $$('[data-group]').forEach(function (group) {
      var name = group.getAttribute('data-group'), multi = group.hasAttribute('data-multi');
      var buttons = $$('button[data-value], a[data-value]', group).filter(function (b) { return b.tagName === 'BUTTON'; });
      var saved = selectionDefaults(name) || store.get('sel.' + name, null);
      if (saved) buttons.forEach(function (b) { paint(name, b, saved.indexOf(b.getAttribute('data-value')) !== -1); });
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          var on = b.getAttribute('aria-pressed') !== 'true';
          if (!multi) buttons.forEach(function (o) { paint(name, o, false); });
          paint(name, b, multi ? on : true);
          var values = buttons.filter(function (o) { return o.getAttribute('aria-pressed') === 'true'; }).map(function (o) { return o.getAttribute('data-value'); });
          onSelect(name, values);
        });
      });
    });
    renderAskAfter();
  }

  /* ---------- squad board: reactions, notes, comments ---------- */
  function setupReactions() {
    $$('[data-react]').forEach(function (b, i) {
      var key = 'react.' + i + '.' + b.getAttribute('data-react');
      var m = b.textContent.match(/^(.*?)(?:\s·\s(\d+))?$/), label = m[1], base = +(m[2] || 0);
      function draw(on) {
        var n = base + (on ? 1 : 0);
        b.textContent = n ? label + ' · ' + n : label;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.style.background = on ? BRASS : 'transparent';
        b.style.borderColor = on ? BRASS : BORDER;
      }
      draw(!!store.get(key, false));
      b.addEventListener('click', function () { var on = !store.get(key, false); store.set(key, on); draw(on); });
    });
  }
  function renderBoard() {
    var posts = $('#posts'); if (!posts) return;
    var p = profile(), who = ((p.rank.replace('.', '')) + '. ' + ((p.name || '').trim().split(/\s+/).slice(-1)[0] || 'Me')).toUpperCase();
    store.get('notes', []).slice().reverse().forEach(function (n) {
      var c = el('div', 'display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 8px; background: rgba(184,150,62,0.16); box-shadow: inset 0 0 0 1px rgba(184,150,62,0.45)');
      c.appendChild(el('span', "font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .08em; color: #5a5d4c", who + ' (YOU) · TONIGHT'));
      c.appendChild(el('span', 'font-size: 15px; font-weight: 600', n.about));
      c.appendChild(el('span', 'font-size: 14px; line-height: 1.45', n.text));
      posts.insertBefore(c, posts.firstChild);
    });
    bind('commentCount', plural(2 + store.get('comments', []).length, 'comment'));
  }
  function bubble(text) {
    var d = el('div', 'display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 8px; background: rgba(184,150,62,0.18); align-self: flex-end; max-width: 86%');
    d.appendChild(el('span', "font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; color: #5a5d4c", 'YOU'));
    d.appendChild(el('span', 'font-size: 15px; line-height: 1.4', text));
    return d;
  }
  function renderComments() {
    var box = $('#comments'); if (!box) return;
    store.get('comments', []).forEach(function (t) { box.appendChild(bubble(t)); });
    box.style.maxHeight = '300px'; box.style.overflowY = 'auto';
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- buttons that do something before (or instead of) navigating ---------- */
  function setupActions() {
    $$('[data-action]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var act = a.getAttribute('data-action');
        if (act === 'keep-moment') keepMoment();
        else if (act === 'let-go') store.set('draft', {});
        else if (act === 'attach-photo') { var pick = store.get('photoPick', null); saveDraft({ photo: pick == null ? 1 : pick }); }
        else if (act === 'quiet') store.set('quiet', todayKey());
        else if (act === 'post-note') {
          var f = $('#squadnote'), t = f ? f.value.trim() : '';
          if (t) { var n = store.get('notes', []); n.push({ text: t, about: 'Re: Late dinner with the squad' }); store.set('notes', n); }
        } else if (act === 'send-comment') {
          e.preventDefault();
          var r = $('#reply'), txt = r ? r.value.trim() : '';
          if (!txt) { if (r) r.focus(); return; }
          var c = store.get('comments', []); c.push(txt); store.set('comments', c);
          var box = $('#comments'); if (box) { box.appendChild(bubble(txt)); box.scrollTop = box.scrollHeight; }
          r.value = '';
        } else if (act === 'reset') {
          e.preventDefault(); store.clear(); location.href = 'index.html';
        }
      });
    });
  }

  /* ---------- form fields ---------- */
  function setupFields() {
    var on = function (id, ev, fn) { var f = $('#' + id); if (f) f.addEventListener(ev, function () { fn(f); }); };
    on('pname', 'input', function (f) { saveProfile({ name: f.value }); });
    on('punit', 'input', function (f) { saveProfile({ unit: f.value }); });
    on('penlist', 'change', function (f) { if (f.value) saveProfile({ enlist: f.value }); });
    on('pdischarge', 'change', function (f) { if (f.value) saveProfile({ discharge: f.value }); });
    on('showd', 'change', function (f) { saveProfile({ showD: f.checked }); });
    on('what', 'input', function (f) { saveDraft({ text: f.value }); });
    on('felt', 'input', function (f) { saveDraft({ felt: +f.value }); });
    on('word', 'input', function (f) { saveDraft({ word: f.value }); });
    on('noask', 'change', function (f) { store.set('noask', f.checked); });
    var noask = $('#noask'); if (noask) noask.checked = store.get('noask', true);
    $$('input[name="who"]').forEach(function (c) {
      c.addEventListener('change', function () {
        styleCheckRow(c);
        saveDraft({ who: $$('input[name="who"]').filter(function (x) { return x.checked; }).map(function (x) { return x.value; }) });
      });
    });
    var hours = store.get('hours', null);
    $$('input[name="hours"]').forEach(function (r) {
      if (hours) r.checked = r.value === hours;
      var paintRow = function () { $$('input[name="hours"]').forEach(function (x) { var l = x.closest('label'); if (l) { l.style.borderColor = x.checked ? BRASS : BORDER; l.style.background = x.checked ? 'rgba(184,150,62,0.15)' : 'transparent'; } }); };
      r.addEventListener('change', function () { store.set('hours', r.value); paintRow(); });
      paintRow();
    });
    if (hours) bind('phoneHours', hours.split(' · ')[0]);
    $$('[data-cycle]').forEach(function (b) {
      var key = 'cycle.' + b.getAttribute('data-cycle'), opts = b.getAttribute('data-options').split('|'), out = $('[data-cycle-value]', b);
      var cur = store.get(key, out.textContent);
      out.textContent = cur;
      b.addEventListener('click', function () { var i = (opts.indexOf(out.textContent) + 1) % opts.length; out.textContent = opts[i]; store.set(key, opts[i]); });
    });
  }

  function addResetLink() {
    var nav = $('.demo-nav'); if (!nav) return;
    var a = el('a', null, 'Reset demo'); a.href = 'index.html'; a.setAttribute('data-action', 'reset');
    nav.appendChild(a);
  }

  document.addEventListener('DOMContentLoaded', function () {
    addResetLink();
    renderProfile();
    renderDraft();
    renderCounts();
    renderTonight();
    renderDetail();
    renderBoard();
    renderComments();
    setupGroups();
    setupReactions();
    setupFields();
    setupActions();
  });
})();
