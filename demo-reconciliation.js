(() => {
  const AS_OF = '2026-03-31';
  const A = [
    ['inv-1001', '2026-03-02', 'Mensah Supplies', '1,200.00'],
    ['INV-1002 ', '2026-03-03', 'Adu Trading ', '450.50'],
    ['inv-1003', '2026-03-05', 'Boateng Foods', '2,310.00'],
    ['INV-1004', '2026-03-06', 'Mensah Supplies', '780.00'],
    ['INV-1005', '2026-03-09', 'Owusu Logistics', '1,950.75'],
    ['INV-1006', '2026-03-10', 'Adu Trading', '300.00'],
    ['INV-1007', '2026-03-12', 'Quaye Packaging', '5,400.00'],
    ['INV-1008', '2026-03-13', 'Boateng Foods', '615.20'],
    ['INV-1009', '2026-03-16', 'Owusu Logistics', '1,020.00'],
    ['INV-1010', '2026-03-18', 'Quaye Packaging', '2,875.00'],
    ['INV-1011', '2026-03-20', 'Mensah Supplies', '940'],
    ['INV-1012', '2026-03-23', 'Adu Trading', '1,480.00'],
    ['INV-1013', '2026-03-26', 'Boateng Foods', '3,100.00'],
    ['INV-1014', '2026-03-27', 'Owusu Logistics', '705.40'],
    ['INV-1015', '2026-03-12', 'Quaye Packaging', '860.00'],
    ['INV-1016', '2026-03-14', 'Mensah Supplies', '2,250.00'],
    ['INV-1017', '2026-03-24', 'Adu Trading', '1,125.00'],
    ['INV-1018', '2026-01-30', 'Boateng Foods', '4,600.00'],
    ['INV-1019', '2026-03-29', 'Owusu Logistics', '520.00'],
  ];
  const B = [
    ['inv-1001', '2026-03-02', 'Mensah Supplies', '1200'],
    ['INV-1002', '2026-03-03', 'Adu Trading', '450.50'],
    ['INV-1003', '2026-03-06', 'Boateng Foods', '2,310.00'],
    ['INV-1004', '2026-03-06', 'Mensah Supplies', '780.00'],
    ['INV-1005', '2026-03-09', 'Owusu Logistics', '1,950.75'],
    ['INV-1005', '2026-03-09', 'Owusu Logistics', '1,950.75'],
    ['INV-1006', '2026-03-10', 'Adu Trading', '300.00'],
    ['INV-1007', '2026-03-12', 'Quaye Packaging', '5,400.00'],
    ['INV-1008', '2026-03-13', 'Boateng Foods', '615.20'],
    ['INV-1009', '2026-03-17', 'Owusu Logistics', '1,020.00'],
    ['INV-1010', '2026-03-18', 'Quaye Packaging', '2,875.00'],
    ['INV-1011', '2026-03-20', 'Mensah Supplies', '940.00'],
    ['INV-1012', '2026-03-23', 'Adu Trading', '1,480.00'],
    ['INV-1013', '2026-04-02', 'Boateng Foods', '3,100.00'],
    ['INV1014', '2026-03-27', 'Owusu Logistics', '705.40'],
    ['INV-1015', '2026-03-12', 'Quaye Packaging', '806.00'],
    ['PAY-7781', '2026-03-15', 'Mensah Supplies', '2,250.00'],
    ['PAY-7790', '2026-03-24', 'Adu Trading', '1,125.00'],
    ['PAY-7802', '2026-03-19', 'Quaye Packaging', '1,300.00'],
  ];

  const normRef = (r) => {
    const s = r.trim().toUpperCase().replace(/\s+/g, '');
    const m = s.match(/^([A-Z]+)-?(\d+)$/);
    return m ? `${m[1]}-${m[2]}` : s;
  };
  const toCents = (s) => Math.round(parseFloat(String(s).replace(/,/g, '')) * 100);
  const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
  const gh = (c) => (c / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const mk = (rows, side) => rows.map((r, i) => ({
    side, i, rawRef: r[0], rawParty: r[2], rawAmt: r[3], date: r[1],
    ref: normRef(r[0]), party: r[2].trim(), cents: toCents(r[3]),
    status: 'raw', note: '', match: null,
  }));

  const run = (step) => {
    const a = mk(A, 'A'), b = mk(B, 'B');
    if (step >= 2) {
      const count = (arr) => arr.reduce((m, x) => (m[x.ref] = (m[x.ref] || 0) + 1, m), {});
      const ca = count(a), cb = count(b);
      a.forEach((x) => {
        const y = b.find((z) => z.ref === x.ref && !z.match);
        if (!y) return;
        if (ca[x.ref] > 1 || cb[x.ref] > 1) { x.status = 'hold'; x.note = 'Duplicate reference: held, not auto-matched'; return; }
        if (x.cents !== y.cents) { x.status = 'hold'; x.match = y; y.match = x; x.note = `Amount differs: A ${gh(x.cents)} vs B ${gh(y.cents)}`; y.status = 'hold'; y.note = 'Amount differs from Source A'; return; }
        x.match = y; y.match = x; x.status = 'exact'; y.status = 'exact';
        const gap = Math.abs(day(x.date) - day(y.date));
        if (gap > 3) { x.note = `Matched; dates ${gap} days apart (timing difference to note)`; }
      });
      b.forEach((y) => { if (!y.match && cb_dup(b, y)) { y.status = 'hold'; y.note = 'Duplicate reference in Source B'; } });
    }
    if (step >= 3) {
      a.filter((x) => x.status === 'raw').forEach((x) => {
        const c = b.filter((y) => !y.match && y.status === 'raw' && y.party === x.party && y.cents === x.cents && Math.abs(day(x.date) - day(y.date)) <= 3);
        if (c.length === 1) { x.status = 'probable'; x.match = c[0]; c[0].match = x; c[0].status = 'probable'; x.note = 'Same party, amount and date window; references differ. Needs a reviewer.'; c[0].note = 'Candidate for Source A ' + x.ref; }
      });
    }
    if (step >= 4) {
      a.concat(b).filter((x) => x.status === 'raw').forEach((x) => { x.status = 'open'; x.note = x.side === 'A' ? 'In Source A only' : 'In Source B only'; });
    }
    return { a, b };
  };
  const cb_dup = (b, y) => b.filter((z) => z.ref === y.ref).length > 1;

  const LABEL = { raw: ['Not yet processed', 'muted'], exact: ['Matched', 'ok'], probable: ['Probable: review', 'review'], hold: ['Held: exception', 'open'], open: ['Open exception', 'open'] };
  const EXPLAIN = [
    'Step 0. The records exactly as received: mixed case, stray spaces, amounts with and without commas.',
    'Step 1. Standardise references, text and amounts. Original values are kept; nothing is matched yet.',
    'Step 2. Match unique references first. Duplicate references and amount differences are held, not forced.',
    'Step 3. For what is left, try a controlled combination: same party, same amount, dates within 3 days. These are only probable matches.',
    'Step 4. Everything still unresolved goes to a visible exception queue with an age and a suggested next action.',
  ];

  const $ = (id) => document.getElementById(id);
  const cell = (tr, text, cls) => { const td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); return td; };
  const badge = (tr, st) => { const td = document.createElement('td'); const s = document.createElement('span'); s.className = 'badge badge-' + LABEL[st][1]; s.textContent = LABEL[st][0]; td.appendChild(s); tr.appendChild(td); return td; };
  const noteLine = (td, note) => { if (!note) return; const d = document.createElement('div'); d.className = 'demo-note'; d.textContent = note; td.appendChild(d); };

  const render = (step) => {
    const { a, b } = run(step);
    const raw = step === 0;
    $('step-explain').textContent = EXPLAIN[step];
    document.querySelectorAll('.demo-step').forEach((btn) => btn.setAttribute('aria-pressed', String(+btn.dataset.step === step)));

    const ra = $('rows-a'); ra.textContent = '';
    a.forEach((x) => {
      const tr = document.createElement('tr');
      cell(tr, raw ? `"${x.rawRef}"` : x.ref); cell(tr, x.date); cell(tr, raw ? `"${x.rawParty}"` : x.party);
      cell(tr, raw ? x.rawAmt : gh(x.cents), 'num');
      const st = badge(tr, x.status); noteLine(st, x.note);
      cell(tr, x.match ? x.match.ref : '–');
      ra.appendChild(tr);
    });
    const rb = $('rows-b'); rb.textContent = '';
    b.forEach((y) => {
      const tr = document.createElement('tr');
      cell(tr, raw ? `"${y.rawRef}"` : y.ref); cell(tr, y.date); cell(tr, raw ? `"${y.rawParty}"` : y.party);
      cell(tr, raw ? y.rawAmt : gh(y.cents), 'num');
      const st = badge(tr, y.status); noteLine(st, y.note);
      rb.appendChild(tr);
    });

    const sum = (arr) => arr.reduce((s, x) => s + x.cents, 0);
    const ex = a.filter((x) => x.status === 'exact'), pr = a.filter((x) => x.status === 'probable'), op = a.filter((x) => x.status === 'open' || x.status === 'hold');
    $('k-a').textContent = a.length;
    $('k-exact').textContent = step >= 2 ? ex.length : '–';
    $('k-prob').textContent = step >= 3 ? pr.length : '–';
    $('k-open').textContent = step >= 4 ? op.length : (step >= 2 ? op.length + ' held so far' : '–');
    const idn = $('identity');
    if (step >= 4) {
      const ok = sum(a) === sum(ex) + sum(pr) + sum(op);
      idn.textContent = `Control: Source A total GHS ${gh(sum(a))} = matched ${gh(sum(ex))} + probable ${gh(sum(pr))} + open ${gh(sum(op))}. ${ok ? 'The identity holds.' : 'The identity does NOT hold: investigate.'}`;
      idn.className = 'demo-identity ' + (ok ? 'is-ok' : 'is-bad');
    } else { idn.textContent = 'The reconciliation identity is checked once the exception queue is built (step 4).'; idn.className = 'demo-identity'; }

    const act = $('actions'); act.textContent = '';
    if (step >= 4) {
      const asOf = day(AS_OF);
      const items = a.filter((x) => x.status === 'open' || x.status === 'hold').map((x) => `${x.ref} (${x.party}, GHS ${gh(x.cents)}, ${Math.round(asOf - day(x.date))} days old): ${x.note}. Next: ${x.status === 'hold' ? 'confirm with the record owner before any adjustment' : 'find the source document or confirm it is genuinely missing'}.`);
      b.filter((y) => y.status === 'open').forEach((y) => items.push(`${y.ref} (${y.party}, GHS ${gh(y.cents)}): ${y.note}. Next: identify which Source A record, if any, it belongs to.`));
      pr.forEach((x) => items.push(`${x.ref} ↔ ${x.match.ref}: probable match. Next: confirm the supporting reference before promoting it to a match.`));
      items.forEach((t) => { const li = document.createElement('li'); li.textContent = t; act.appendChild(li); });
    } else { const li = document.createElement('li'); li.textContent = 'Reach step 4 to see the review queue.'; act.appendChild(li); }
  };

  document.querySelectorAll('.demo-step').forEach((btn) => btn.addEventListener('click', () => render(+btn.dataset.step)));
  render(0);
})();
