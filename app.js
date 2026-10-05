const COLORS = ['#198754', '#fd7e14', '#0d6efd', '#d63384', '#20c997',
                '#ffc107', '#6c757d', '#6f42c1', '#0dcaf0', '#795548'];

let orders = [];   
let nextId = 1;
let stats = null;  
const charts = {}; 

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g,
  ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));


LAB_TESTS.forEach(t => {
  $('tests').insertAdjacentHTML('beforeend',
    `<input type="checkbox" class="btn-check" id="t${t.id}" value="${t.id}" autocomplete="off">` +
    `<label class="btn btn-outline-success btn-sm" for="t${t.id}">${t.short}</label>`);
});

function updateSelCount() {
  $('selCount').textContent = document.querySelectorAll('#tests input:checked').length;
}
$('tests').addEventListener('change', updateSelCount);

function showMsg(text) {
  $('msg').textContent = text;
  $('msg').classList.remove('d-none');
}

$('orderForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('name').value.trim();
  const age = parseInt($('age').value, 10);
  const sex = document.querySelector('input[name="sex"]:checked').value;
  const ids = [...document.querySelectorAll('#tests input:checked')].map(i => Number(i.value));

  if (!name) return showMsg('Введите имя клиента');
  if (isNaN(age) || age < 0 || age > 120) return showMsg('Возраст: число от 0 до 120');
  if (ids.length === 0) return showMsg('Выберите хотя бы одно исследование');

  $('msg').classList.add('d-none');
  orders.push({
    id: nextId++,
    client: name,
    sex: sex,
    age: age,
    tests: LAB_TESTS.filter(t => ids.includes(t.id)),
  });
  e.target.reset(); 
  updateSelCount();
  onOrdersChanged();
});


function onOrdersChanged() {
  renderOrders();
  hideResults(); 
  $('calc').disabled = orders.length === 0;
}

function renderOrders() {
  $('count').textContent = orders.length;
  $('orders').innerHTML = orders.length === 0
    ? '<li class="list-group-item text-muted">Пока нет заказов. Добавьте первый.</li>'
    : orders.map(o =>
        `<li class="list-group-item d-flex justify-content-between align-items-center gap-2">` +
        `<div><strong>${esc(o.client)}</strong>, ${o.age} лет, ${o.sex === 'male' ? 'М' : 'Ж'}` +
        `<div class="small text-muted">${o.tests.map(t => t.short).join(', ')}</div></div>` +
        `<button class="btn btn-outline-danger btn-sm" data-id="${o.id}">Удалить</button></li>`
      ).join('');
}

$('orders').addEventListener('click', e => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  orders = orders.filter(o => o.id !== Number(btn.dataset.id));
  onOrdersChanged();
});


$('demo').addEventListener('click', () => {
  const names = ['Айдар', 'Мария', 'Серик', 'Елена', 'Дана',
                 'Нурлан', 'Ольга', 'Тимур', 'Алия', 'Игорь'];
  const rnd = n => Math.floor(Math.random() * n);

  for (let i = 0; i < 15; i++) {
    const ids = new Set();
    if (Math.random() < 0.5) ids.add(1);   
    const target = 1 + rnd(4);             
    while (ids.size < target) ids.add(1 + rnd(LAB_TESTS.length)); 
    orders.push({
      id: nextId++,
      client: names[rnd(names.length)],
      sex: Math.random() < 0.5 ? 'male' : 'female',
      age: 18 + rnd(55),                   
      tests: LAB_TESTS.filter(t => ids.has(t.id)),
    });
  }
  onOrdersChanged();
});


$('calc').addEventListener('click', () => {
  stats = calculate(orders); 
  renderResults();
  $('results').scrollIntoView({ behavior: 'smooth' });
});

function hideResults() {
  Object.values(charts).forEach(ch => ch.destroy());
  for (const key in charts) delete charts[key];
  $('results').classList.add('d-none');
  $('results').innerHTML = '';
}


function rankList(rows, limit) {
  return rows.slice(0, limit).map((r, i) =>
    `<li class="list-group-item d-flex justify-content-between">` +
    `<span>${i + 1}. ${esc(r.label)}</span>` +
    `<strong>${r.f} · ${r.rel.toFixed(1)}%</strong></li>`).join('');
}

function kpi(title, value) {
  return `<div class="col"><div class="card shadow-sm h-100"><div class="card-body py-3">` +
         `<div class="fs-3 fw-bold">${value}</div><div class="small text-muted">${title}</div>` +
         `</div></div></div>`;
}

function renderResults() {
  const s = stats;
  const sexRows = [
    { label: 'Мужчины', f: s.male, rel: s.male / s.clients * 100 },
    { label: 'Женщины', f: s.female, rel: s.female / s.clients * 100 },
  ];

  $('results').innerHTML = `
    <div class="row row-cols-2 row-cols-md-4 g-3 mb-3">
      ${kpi('Клиентов', s.clients)}
      ${kpi('Исследований', s.testsTotal)}
      ${kpi('На клиента', s.testsPerClient.toFixed(1))}
      ${kpi('Средний возраст', s.meanAge.toFixed(1))}
    </div>

    <div class="card shadow-sm mb-3"><div class="card-body">
      <h2 class="h5 mb-0">Популярные исследования</h2>
      <p class="small text-muted">Дискретный ряд: частота f и относительная частота f/N</p>
      <div style="position:relative;height:300px"><canvas id="chartTests"></canvas></div>
      <ul class="list-group list-group-flush mt-3">${rankList(s.tests, 10)}</ul>
    </div></div>

    <div class="row g-3 mb-3">
      <div class="col-md-6"><div class="card shadow-sm h-100"><div class="card-body">
        <h2 class="h5 mb-0">Пол клиентов</h2>
        <p class="small text-muted">Круговая диаграмма: сектор = f / N · 360°</p>
        <div style="position:relative;height:300px"><canvas id="chartSex"></canvas></div>
      </div></div></div>
      <div class="col-md-6"><div class="card shadow-sm h-100"><div class="card-body">
        <h2 class="h5 mb-0">Разделы лаборатории</h2>
        <p class="small text-muted">Доля исследований по разделам</p>
        <div style="position:relative;height:300px"><canvas id="chartSections"></canvas></div>
      </div></div></div>
    </div>

    <div class="card shadow-sm mb-3"><div class="card-body">
      <h2 class="h5 mb-0">Возраст клиентов</h2>
      <p class="small text-muted">Интервальный ряд, исключающий метод [L; U)</p>
      <div class="alert alert-light border small">
        N = ${s.clients}, min = ${s.minAge}, max = ${s.maxAge}<br>
        Размах R = max − min = ${s.maxAge} − ${s.minAge} = ${s.range}<br>
        Число классов K = 1 + 3,322 · lg N ≈ ${s.k}<br>
        Ширина класса C = R / K → ${s.c} (округлено до кратного 5)<br>
        Середина класса = (L + U) / 2<br>
        Среднее x̄ = Σx / N = <strong>${s.meanAge.toFixed(1)}</strong><br>
        Среднее по классам x̄ = Σ(f · середина) / Σf = <strong>${s.meanGrouped.toFixed(1)}</strong>
      </div>
      <div class="btn-group mb-3" role="group" aria-label="Вид графика">
        <input type="radio" class="btn-check" name="ageView" id="vHist" value="hist" checked>
        <label class="btn btn-outline-success" for="vHist">Гистограмма</label>
        <input type="radio" class="btn-check" name="ageView" id="vPoly" value="poly">
        <label class="btn btn-outline-success" for="vPoly">Полигон</label>
        <input type="radio" class="btn-check" name="ageView" id="vOgive" value="ogive">
        <label class="btn btn-outline-success" for="vOgive">Огива</label>
      </div>
      <div style="position:relative;height:320px"><canvas id="chartAge"></canvas></div>
      <div class="table-responsive mt-3">
        <table class="table table-sm table-bordered text-center mb-0">
          <thead class="table-light"><tr>
            <th>Класс</th><th>Середина</th><th>f</th><th>«менее чем»</th><th>«более чем»</th>
          </tr></thead>
          <tbody>${s.classes.map(c =>
            `<tr><td>${c.label}</td><td>${c.mid}</td><td>${c.f}</td>` +
            `<td>${c.cumLess}</td><td>${c.cumMore}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div></div>

    <div class="card shadow-sm"><div class="card-body">
      <h2 class="h5 mb-0">Клиенты</h2>
      <p class="small text-muted">Кто сделал больше всего исследований</p>
      <ul class="list-group list-group-flush">${rankList(s.topClients, 5)}</ul>
    </div></div>`;

  $('results').classList.remove('d-none');

  drawBar();
  drawPie('sex', 'chartSex', sexRows);
  drawPie('sections', 'chartSections', s.sections);
  drawAge('hist');
  document.querySelectorAll('input[name="ageView"]').forEach(r =>
    r.addEventListener('change', () => drawAge(r.value)));
}


function makeChart(key, canvasId, config) {
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart($(canvasId), config);
}

const base = { responsive: true, maintainAspectRatio: false };

function drawBar() {
  const top = stats.tests.slice(0, 10);
  makeChart('bar', 'chartTests', {
    type: 'bar',
    data: {
      labels: top.map(r => r.short),
      datasets: [{ label: 'Частота f', data: top.map(r => r.f), backgroundColor: '#198754' }],
    },
    options: {
      ...base,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}


function drawPie(key, canvasId, rows) {
  const items = rows.filter(r => r.f > 0);
  makeChart(key, canvasId, {
    type: 'pie',
    data: {
      labels: items.map(r => `${r.label}: ${r.f} (${(r.rel * 3.6).toFixed(1)}°)`),
      datasets: [{
        data: items.map(r => r.f),
        backgroundColor: items.map((_, i) => COLORS[i % COLORS.length]),
      }],
    },
    options: { ...base, plugins: { legend: { position: 'bottom' } } },
  });
}

function drawAge(view) {
  const cl = stats.classes;
  const c = stats.c;
  const last = cl[cl.length - 1];
  const yAxis = (text) => ({ beginAtZero: true, title: { display: true, text }, ticks: { precision: 0 } });
  let config;

  if (view === 'hist') {
    config = {
      type: 'bar',
      data: {
        labels: cl.map(k => k.label),
        datasets: [{
          label: 'Частота f',
          data: cl.map(k => k.f),
          backgroundColor: '#198754',
          borderColor: '#fff',
          borderWidth: 1,
          barPercentage: 1,
          categoryPercentage: 1,
        }],
      },
      options: {
        ...base,
        plugins: { legend: { display: false } },
        scales: { x: { title: { display: true, text: 'Возраст (классы)' } }, y: yAxis('Частота f') },
      },
    };
  } else if (view === 'poly') {
    const pts = [
      { x: cl[0].mid - c, y: 0 },
      ...cl.map(k => ({ x: k.mid, y: k.f })),
      { x: last.mid + c, y: 0 },
    ];
    config = {
      type: 'scatter',
      data: { datasets: [{
        label: 'Полигон частот', data: pts, showLine: true,
        borderColor: '#198754', backgroundColor: '#198754', tension: 0,
      }] },
      options: {
        ...base,
        plugins: { legend: { display: false } },
        scales: {
          x: { type: 'linear', min: pts[0].x, max: pts[pts.length - 1].x,
               ticks: { stepSize: c }, title: { display: true, text: 'Возраст (середины классов)' } },
          y: yAxis('Частота f'),
        },
      },
    };
  } else {
    const less = [{ x: cl[0].lower, y: 0 }, ...cl.map(k => ({ x: k.upper, y: k.cumLess }))];
    const more = [...cl.map(k => ({ x: k.lower, y: k.cumMore })), { x: last.upper, y: 0 }];
    config = {
      type: 'scatter',
      data: { datasets: [
        { label: '«менее чем»', data: less, showLine: true, borderColor: '#198754', backgroundColor: '#198754', tension: 0 },
        { label: '«более чем»', data: more, showLine: true, borderColor: '#fd7e14', backgroundColor: '#fd7e14', tension: 0 },
      ] },
      options: {
        ...base,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { type: 'linear', min: cl[0].lower, max: last.upper,
               ticks: { stepSize: c }, title: { display: true, text: 'Границы классов' } },
          y: yAxis('Накопленная частота'),
        },
      },
    };
  }
  makeChart('age', 'chartAge', config);
}
