/* Terroir site JS — progressive enhancement only. The site is fully usable without it. */
(function () {
  'use strict';
  var d = document;

  /* ── 18+ notice: shown once, remembered in localStorage ─────────────── */
  var KEY = 'terroir-age-ok';
  var gate = d.querySelector('[data-agegate]');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  if (gate && stored !== '1') {
    gate.hidden = false;
    var yes = gate.querySelector('[data-age-yes]');
    var no = gate.querySelector('[data-age-no]');
    var msg = gate.querySelector('[data-age-under]');
    var body = gate.querySelector('[data-age-body]');
    if (yes) setTimeout(function () { yes.focus({ preventScroll: true }); }, 50);
    yes && yes.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
      gate.hidden = true;
    });
    no && no.addEventListener('click', function () {
      if (body) body.hidden = true;
      if (msg) { msg.hidden = false; msg.focus(); }
    });
  }

  /* ── mobile menu (<details>): Esc and outside click close it ───────── */
  var nav = d.querySelector('[data-nav-mobile]');
  if (nav) {
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.open) { nav.open = false; nav.querySelector('summary').focus(); }
    });
    d.addEventListener('click', function (e) {
      if (nav.open && !nav.contains(e.target)) nav.open = false;
    });
  }

  /* ── early-access form ───────────────────────────────────────────── */
  var form = d.querySelector('[data-ea-form]');
  if (!form) return;
  var endpoint = form.getAttribute('data-endpoint');
  var contact = form.getAttribute('data-contact');
  var summary = form.querySelector('[data-form-summary]');
  var status = form.querySelector('[data-form-status]');
  form.setAttribute('novalidate', '');

  function setError(field, on) {
    var input = form.querySelector('[name="' + field + '"]');
    var err = form.querySelector('[data-error="' + field + '"]');
    if (!input || !err) return;
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    err.hidden = !on;
  }

  function validate() {
    var email = form.elements.email.value.trim();
    var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    var okConsent = form.elements.consent.checked;
    setError('email', !okEmail);
    setError('consent', !okConsent);
    var ok = okEmail && okConsent;
    if (summary) summary.hidden = ok;
    if (!ok) {
      (okEmail ? form.elements.consent : form.elements.email).focus();
    }
    return ok;
  }

  ['email', 'consent'].forEach(function (n) {
    var el = form.elements[n];
    el && el.addEventListener('change', function () {
      if (el.getAttribute('aria-invalid') === 'true') validate();
    });
  });

  form.addEventListener('submit', function (e) {
    if (!validate()) { e.preventDefault(); return; }
    if (endpoint) return; // real POST to the configured endpoint

    e.preventDefault();
    var f = form.elements;
    var labels = JSON.parse(form.getAttribute('data-labels') || '{}');
    var lines = [
      labels.intro || '',
      '',
      (labels.email || 'Email') + ': ' + f.email.value.trim(),
      (labels.language || 'Language') + ': ' + (f.language.options[f.language.selectedIndex] || {}).text,
      (labels.cellar || 'Cellar') + ': ' + (f.cellar.options[f.cellar.selectedIndex] || {}).text,
      '',
      (labels.wish || 'Wish') + ':',
      f.wish.value.trim() || '—',
      '',
      '— ' + (labels.consent || 'Consent') + ' ✓',
    ];
    var href = 'mailto:' + contact +
      '?subject=' + encodeURIComponent(labels.subject || 'Terroir') +
      '&body=' + encodeURIComponent(lines.join('\n'));
    if (status) status.hidden = false;
    window.location.href = href;
  });
})();
