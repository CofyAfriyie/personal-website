(() => {
  // Real rows copied from GL_Dataset.csv (Kaggle, CC0). Totals are calculated over all 21,551 lines.
  const ROWS = [
    ['1000102', '02-05-26', 'OT01937', ' -   ', '2,380,000'],
    ['1000102', '02-05-26', 'OT01939', ' -   ', '3,462,500'],
    ['1000102', '10-05-26', 'OT02016', '26,604', ' -   '],
    ['1000102', '31-05-26', 'OT01947', ' -   ', '4,258,143'],
    ['8080900', '31-05-26', 'JR00023', '92,474', ' -   '],
    ['8080900', '31-05-26', 'JR00023', '92,474', ' -   '],
    ['9001302', '01-06-26', 'JR00041', ' -   ', '210'],
  ];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (n) => n.toLocaleString('en-GB');
  const num = (s) => { const t = s.trim(); return t === '-' ? 0 : parseFloat(t.replace(/,/g, '')); };
  const naive = (s) => (/^\s*\d+(\.\d+)?\s*$/.test(s) ? s.trim() : 'blank');
  const monthFirst = (s) => {
    const [a, b, y] = s.split('-').map(Number);
    return a >= 1 && a <= 12 ? `${b} ${MON[a - 1]} 20${y}` : 'invalid date';
  };
  const dayFirst = (s) => { const [d, m, y] = s.split('-').map(Number); return `${d} ${MON[m - 1]} 20${y}`; };

  const STEPS = [
    {
      explain: 'The file as a default reader sees it. Amounts are text with commas, a dash means nil, and dates are read month-first. Blank cells and wrong months are the reader\'s guesses, not the data.',
      kpis: [['2,675 of 21,551', 'Debit amounts read as numbers'], ['502,165', 'Debits "total"'], ['377,236', 'Credits "total"'], ['124,929', 'Apparent imbalance']],
      verdict: 'Raw reading: the books seem out of balance, and the dates seem to span the whole year. Neither is true.',
      head: ['Account Code', 'Date (read month-first)', 'Transaction ID', 'Debit (as read)', 'Credit (as read)'],
      rows: () => ROWS.map((r) => [r[0], monthFirst(r[1]), r[2], naive(r[3]), naive(r[4])]),
    },
    {
      explain: 'Trim the header spaces, remove thousands commas, treat the dash as zero, and read dates day-first (dd-mm-yy). Every line has either a debit or a credit, never both.',
      kpis: [['21,551 of 21,551', 'Lines read correctly'], ['13,863,160,429', 'Debits'], ['13,863,160,344', 'Credits'], ['85', 'Difference']],
      verdict: 'Cleaned reading: the ledger balances to within 85, and all dates fall in May 2026 except one line.',
      head: ['Account Code', 'Date', 'Transaction ID', 'Debit', 'Credit'],
      rows: () => ROWS.map((r) => [r[0], dayFirst(r[1]), r[2], fmt(num(r[3])), fmt(num(r[4]))]),
    },
    {
      explain: '2,848 lines (13.2%) are exact copies of another line. Before deleting them, test the rule against the control total.',
      kpis: [['2,848', 'Exact repeated lines'], ['13,056,247,383', 'Debits if removed'], ['13,843,634,655', 'Credits if removed'], ['787,387,272', 'Out of balance if removed']],
      verdict: 'Decision: keep them. Removing the repeats breaks a ledger that already balanced, so they are genuine repeated postings. For example, the same 400 credit appears 39 times on one account on one day.',
      head: ['Account Code', 'Date', 'Transaction ID', 'Debit', 'Credit', 'Repeat?'],
      rows: () => ROWS.map((r, i) => [r[0], dayFirst(r[1]), r[2], fmt(num(r[3])), fmt(num(r[4])), i === 4 || i === 5 ? 'Exact copy: kept' : '']),
    },
    {
      explain: 'A transaction ID should balance on its own. Of 5,764 IDs, 5,361 do. These examples are real; one ID (JR00041) holds 2,443 lines, so IDs are not always single entries.',
      kpis: [['5,361', 'IDs that balance'], ['403', 'IDs that do not'], ['401', 'Out by only 1 or 2'], ['210', 'Largest difference']],
      verdict: 'The only imbalance on JR00041 is the single line dated 1 June 2026. Without that line the ID balances. Why it was posted late is a question for the source.',
      head: ['Transaction ID', 'Lines', 'Debits', 'Credits', 'Debits minus credits'],
      rows: () => [
        ['OT01937', '2', '2,380,000', '2,380,000', '0'],
        ['OT02312', '10', '847', '849', '-2'],
        ['JR00028', '68', '313,224', '313,242', '-18'],
        ['JR00041', '2,443', '193,044', '193,254', '-210'],
        ['JR00041 without the 1 June line', '2,442', '193,044', '193,044', '0'],
      ],
    },
  ];

  const $ = (id) => document.getElementById(id);
  const buttons = [...document.querySelectorAll('.demo-step')];
  const show = (n) => {
    const s = STEPS[n];
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.step === n)));
    $('step-explain').textContent = s.explain;
    $('kpis').innerHTML = s.kpis.map((k) => `<div><b>${k[0]}</b><span>${k[1]}</span></div>`).join('');
    $('verdict').textContent = s.verdict;
    $('tbl-cap').textContent = 'Ledger rows at step ' + n;
    $('tbl-head').innerHTML = '<tr>' + s.head.map((h) => `<th scope="col">${h}</th>`).join('') + '</tr>';
    $('tbl-body').innerHTML = s.rows().map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('');
  };
  buttons.forEach((b) => b.addEventListener('click', () => show(+b.dataset.step)));
  show(0);
})();
