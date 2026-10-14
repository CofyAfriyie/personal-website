(() => {
  const S = window.GSE_SNAPSHOT;
  const $ = (id) => document.getElementById(id);
  if (!S) { $('fresh').textContent = 'The data file did not load, so no figures are shown.'; return; }
  const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const days = Math.floor((Date.now() - Date.parse(S.as_of_session + 'T00:00:00Z')) / 864e5);
  $('fresh').textContent = `These prices are from the trading session of ${fmtDate(S.as_of_session)}${days > 1 ? ` (${days} days ago)` : ''}. They are not current prices.`;

  const money = (n) => (n == null ? '–' : n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const rows = S.rows;
  const flags = (r) => { const f = []; if (r.no_trades) f.push(['No trades: price carried over', 'muted']); if (r.large_move) f.push(['Large move: confirm at source', 'review']); return f; };

  $('k-shown').textContent = rows.length;
  $('k-notrade').textContent = rows.filter((r) => r.no_trades).length;
  $('k-large').textContent = rows.filter((r) => r.large_move).length;
  $('k-withheld').textContent = S.withheld.length;

  const draw = () => {
    const q = $('q').value.trim().toLowerCase(), only = $('flagged').checked;
    const body = $('rows'); body.textContent = '';
    let n = 0;
    rows.forEach((r) => {
      if (q && !(r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))) return;
      const f = flags(r); if (only && !f.length) return;
      n++;
      const tr = document.createElement('tr');
      const add = (t, c) => { const td = document.createElement('td'); td.textContent = t; if (c) td.className = c; tr.appendChild(td); return td; };
      add(r.symbol); add(r.name); add(money(r.close_ghs), 'num'); add(money(r.previous_close_ghs), 'num');
      add(r.change_pct == null ? '–' : (r.change_pct > 0 ? '+' : '') + r.change_pct.toFixed(2) + '%', 'num');
      add(r.volume == null ? '–' : r.volume.toLocaleString('en-GB'), 'num');
      const ft = document.createElement('td');
      f.forEach(([t, k]) => { const s = document.createElement('span'); s.className = 'badge badge-' + k; s.textContent = t; ft.appendChild(s); ft.appendChild(document.createTextNode(' ')); });
      tr.appendChild(ft); body.appendChild(tr);
    });
    $('count').textContent = `${n} of ${rows.length} shares shown`;
  };
  $('q').addEventListener('input', draw); $('flagged').addEventListener('change', draw); draw();

  const li = (ul, t) => { const e = document.createElement('li'); e.textContent = t; $(ul).appendChild(e); };
  li('checks', `${rows.length} shares are shown; every duplicate source row for the session agreed, so none had to be dropped for conflicting values.`);
  li('checks', `${S.withheld.length} symbols are withheld because their identity is not yet confirmed in the pipeline (${S.withheld.map((w) => w.symbol).join(', ')}). They are left out rather than guessed.`);
  li('checks', `${rows.filter((r) => r.no_trades).length} shares had no trades that session; their price is carried over from earlier, so it is flagged rather than presented as a fresh price.`);
  li('checks', 'Any move of about 10% or more against the previous session is flagged for confirmation against the exchange source before it is used.');
  li('provenance', `Source: ${S.source}.`);
  li('provenance', `Session shown: ${fmtDate(S.as_of_session)}; compared with ${fmtDate(S.previous_session)}. Currency: ${S.currency}.`);
  li('provenance', `Collected by pipeline run ${S.pipeline_run} (finished ${S.pipeline_run_end_utc}); snapshot prepared ${fmtDate(S.derived_on)}. Pipeline history: ${S.sessions_in_history.toLocaleString('en-GB')} trading dates from ${fmtDate(S.history_from)}.`);
})();
