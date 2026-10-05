function toRows(counts, shorts, total) {
  return Object.keys(counts)
    .map(label => ({
      label: label,
      short: shorts[label] || label,
      f: counts[label],                       // частота f
      rel: total ? counts[label] / total * 100 : 0, // ФОРМУЛА: f / N · 100 %
    }))
    .sort((a, b) => b.f - a.f || a.label.localeCompare(b.label));
}

function calculate(orders) {
  const n = orders.length; // N — число клиентов
  const testsTotal = orders.reduce((s, o) => s + o.tests.length, 0);

  const testCounts = {}, shorts = {}, sectionCounts = {};
  for (const o of orders) {
    for (const t of o.tests) {
      testCounts[t.name] = (testCounts[t.name] || 0) + 1;
      shorts[t.name] = t.short;
      sectionCounts[t.section] = (sectionCounts[t.section] || 0) + 1;
    }
  }

  const display = {}, clientCounts = {};
  for (const o of orders) {
    const key = o.client.trim().toLowerCase();
    if (!(key in display)) display[key] = o.client.trim();
    const name = display[key];
    clientCounts[name] = (clientCounts[name] || 0) + o.tests.length;
  }

  const male = orders.filter(o => o.sex === 'male').length;
  const female = n - male;

  const ages = orders.map(o => o.age).sort((a, b) => a - b);
  const minAge = ages[0];
  const maxAge = ages[n - 1];
  const range = maxAge - minAge;                         // ФОРМУЛА: R = max − min
  const k = Math.max(1, Math.round(1 + 3.322 * Math.log10(n))); // ФОРМУЛА: K = 1 + 3.322·lg N
  const c = Math.max(5, Math.ceil(range / k / 5) * 5);   // ФОРМУЛА: C = R / K, кратно 5
  const l0 = Math.floor(minAge / 5) * 5;                 // начало первого класса кратно 5
  const classCount = Math.floor((maxAge - l0) / c) + 1;

  const classes = [];
  let cum = 0;
  for (let i = 0; i < classCount; i++) {
    const lower = l0 + i * c;                            // L
    const upper = lower + c;                             // U
    const f = ages.filter(a => a >= lower && a < upper).length;
    const cumMore = n - cum;                             // «более чем»: не младше L
    cum += f;                                            // «менее чем»: накопленная сумма f
    classes.push({
      lower, upper, f,
      cumLess: cum,
      cumMore: cumMore,
      mid: (lower + upper) / 2,                          // ФОРМУЛА: середина = (L + U) / 2
      label: lower + '–' + upper,
    });
  }

  const meanAge = ages.reduce((s, a) => s + a, 0) / n;                 // x̄ = Σx / N
  const meanGrouped = classes.reduce((s, cl) => s + cl.f * cl.mid, 0) / n; // x̄ = Σ(f·mid) / Σf

  return {
    clients: n,
    testsTotal: testsTotal,
    testsPerClient: testsTotal / n,
    tests: toRows(testCounts, shorts, testsTotal),
    sections: toRows(sectionCounts, {}, testsTotal),
    topClients: toRows(clientCounts, {}, testsTotal),
    male, female,
    minAge, maxAge, range, k, c,
    meanAge, meanGrouped,
    classes,
  };
}

if (typeof module !== 'undefined') module.exports = { calculate };
