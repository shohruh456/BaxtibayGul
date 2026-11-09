require('dotenv').config();

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3005;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

// ---------- Фронтенд (HTML внутри server.js) ----------
const page = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Автопарк и пользователи</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #e6e9ee; --ink: #1b2a41; --muted: #5d6b80; --line: #c8cfda;
    --panel: #f6f7f9; --accent: #1f4e9c; --danger: #b3261e;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.5 "Barlow", system-ui, sans-serif; }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 40px 20px 64px; display: grid; grid-template-columns: 300px 1fr; gap: 24px 40px; align-items: start; }
  h1 { grid-column: 1 / -1; margin: 0; font: 700 56px/1 "Barlow Condensed", Impact, sans-serif; }
  .tabs { grid-column: 1 / -1; display: flex; gap: 8px; border-bottom: 2px solid var(--ink); }
  .tab { background: transparent; color: var(--ink); border: 2px solid transparent; border-bottom: 0; border-radius: 6px 6px 0 0; margin-bottom: -2px; padding: 10px 22px; }
  .tab[aria-selected="true"] { background: var(--ink); color: #fff; }
  h2 { margin: 0 0 16px; font: 600 24px/1.2 "Barlow Condensed", sans-serif; }
  form.card { background: var(--panel); border: 2px solid var(--ink); border-radius: 6px; padding: 20px; position: sticky; top: 20px; }
  label { display: block; margin-bottom: 14px; font-weight: 500; }
  input { display: block; width: 100%; margin-top: 4px; padding: 10px 12px; font: inherit; color: inherit; background: #fff; border: 1px solid var(--line); border-radius: 4px; }
  input:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .row { display: flex; gap: 8px; }
  button { font: 600 18px/1 "Barlow Condensed", sans-serif; padding: 11px 18px; border-radius: 4px; border: 2px solid var(--ink); background: var(--ink); color: #fff; cursor: pointer; }
  button.ghost { background: transparent; color: var(--ink); }
  button.danger { background: transparent; color: var(--danger); border-color: var(--danger); }
  button.small { font-size: 16px; padding: 7px 12px; }
  .lookup { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .lookup input { margin: 0; max-width: 180px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--line); }
  .badge { min-width: 56px; text-align: center; padding: 6px 12px 6px 18px; background: #fff; border: 2px solid var(--ink); border-left: 10px solid var(--accent); border-radius: 4px; font: 700 22px/1 "Barlow Condensed", sans-serif; }
  .name { font: 600 24px/1.1 "Barlow Condensed", sans-serif; }
  .meta { color: var(--muted); overflow-wrap: anywhere; }
  .actions { display: flex; gap: 8px; }
  .empty { display: block; padding: 28px 0; color: var(--muted); }
  #msg { min-height: 1.5em; margin-top: 12px; color: var(--danger); font-weight: 500; }
  @media (max-width: 760px) {
    .wrap { grid-template-columns: 1fr; }
    form.card { position: static; }
    h1 { font-size: 44px; }
    li { grid-template-columns: auto 1fr; }
    .actions { grid-column: 1 / -1; }
  }
</style>
</head>
<body>
<main class="wrap">
  <h1>Админка</h1>

  <div class="tabs" role="tablist">
    <button class="tab" role="tab" id="tab-cars" data-res="cars">Машины</button>
    <button class="tab" role="tab" id="tab-users" data-res="users">Пользователи</button>
  </div>

  <form id="form" class="card">
    <h2 id="form-title"></h2>
    <div id="fields"></div>
    <div class="row">
      <button type="submit" id="submit">Добавить</button>
      <button type="button" class="ghost" id="cancel" hidden>Отмена</button>
    </div>
    <div id="msg" role="alert"></div>
  </form>

  <section>
    <h2 id="list-title"></h2>
    <div class="lookup">
      <input id="search-id" type="number" min="1" placeholder="Найти по id" aria-label="Найти по id">
      <button type="button" class="small" id="search">Найти</button>
      <button type="button" class="small ghost" id="all">Показать всех</button>
    </div>
    <ul id="list"></ul>
  </section>
</main>

<script>
  const RESOURCES = {
    cars: {
      path: '/cars',
      listTitle: 'Машины в гараже',
      addTitle: 'Добавить машину',
      editTitle: id => 'Изменить машину №' + id,
      empty: 'Гараж пуст. Добавьте первую машину в форме слева.',
      confirm: id => 'Удалить машину №' + id + '?',
      fields: [
        { key: 'brand', label: 'Марка', placeholder: 'Chevrolet', required: true },
        { key: 'model', label: 'Модель', placeholder: 'Gentra', required: true },
        { key: 'year', label: 'Год', type: 'number', placeholder: '2022', number: true }
      ],
      title: c => ((c.brand || '') + ' ' + (c.model || '')).trim() || 'Без названия',
      meta: c => c.year ? c.year + ' год' : 'Год не указан'
    },
    users: {
      path: '/users',
      listTitle: 'Список пользователей',
      addTitle: 'Добавить пользователя',
      editTitle: id => 'Изменить пользователя №' + id,
      empty: 'Пользователей пока нет. Добавьте первого в форме слева.',
      confirm: id => 'Удалить пользователя №' + id + '?',
      fields: [
        { key: 'first_name', label: 'Имя', placeholder: 'Иван', required: true },
        { key: 'last_name', label: 'Фамилия', placeholder: 'Петров', required: true },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'ivan@example.com', required: true },
        { key: 'phone', label: 'Телефон', type: 'tel', placeholder: '+998 90 123 45 67' }
      ],
      title: u => u.first_name + ' ' + u.last_name,
      meta: u => u.email + (u.phone ? ' · ' + u.phone : '')
    }
  };

  const $ = id => document.getElementById(id);
  const list = $('list'), form = $('form'), msg = $('msg');
  let current = 'cars';
  let editingId = null;

  async function api(path, options) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Ошибка сервера: ' + res.status);
    }
    return res.json();
  }

  function switchTo(name) {
    current = name;
    const r = RESOURCES[name];
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.res === name)));
    $('list-title').textContent = r.listTitle;
    $('fields').innerHTML = '';
    for (const f of r.fields) {
      const label = document.createElement('label');
      label.append(f.label + ' ');
      const input = document.createElement('input');
      input.id = 'f-' + f.key;
      input.type = f.type || 'text';
      input.placeholder = f.placeholder || '';
      input.required = !!f.required;
      if (f.type === 'number') { input.min = 1900; input.max = 2100; }
      label.append(input);
      $('fields').append(label);
    }
    $('search-id').value = '';
    reset();
    loadAll();
  }

  async function loadAll() {
    try { msg.textContent = ''; render(await api(RESOURCES[current].path)); }
    catch (e) { msg.textContent = 'Не удалось загрузить список. Сервер запущен?'; }
  }

  async function findById() {
    const id = $('search-id').value;
    if (!id) return loadAll();
    try { msg.textContent = ''; render([await api(RESOURCES[current].path + '/' + id)]); }
    catch (e) { render([]); msg.textContent = e.message; }
  }

  function render(items) {
    const r = RESOURCES[current];
    list.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'empty'; li.textContent = r.empty;
      list.append(li);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      const badge = document.createElement('div');
      badge.className = 'badge'; badge.textContent = item.id;

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'name'; name.textContent = r.title(item);
      const meta = document.createElement('div');
      meta.className = 'meta'; meta.textContent = r.meta(item);
      info.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const edit = document.createElement('button');
      edit.className = 'small ghost'; edit.textContent = 'Изменить';
      edit.onclick = () => startEdit(item);
      const del = document.createElement('button');
      del.className = 'small danger'; del.textContent = 'Удалить';
      del.onclick = () => remove(item.id);
      actions.append(edit, del);

      li.append(badge, info, actions);
      list.append(li);
    }
  }

  function startEdit(item) {
    const r = RESOURCES[current];
    editingId = item.id;
    r.fields.forEach(f => { $('f-' + f.key).value = item[f.key] ?? ''; });
    $('form-title').textContent = r.editTitle(item.id);
    $('submit').textContent = 'Сохранить';
    $('cancel').hidden = false;
    $('f-' + r.fields[0].key).focus();
  }

  function reset() {
    editingId = null;
    form.reset();
    $('form-title').textContent = RESOURCES[current].addTitle;
    $('submit').textContent = 'Добавить';
    $('cancel').hidden = true;
  }

  async function remove(id) {
    const r = RESOURCES[current];
    if (!confirm(r.confirm(id))) return;
    try {
      await api(r.path + '/' + id, { method: 'DELETE' });
      if (editingId === id) reset();
      loadAll();
    } catch (e) { msg.textContent = e.message; }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    const r = RESOURCES[current];
    const body = {};
    for (const f of r.fields) {
      const v = $('f-' + f.key).value.trim();
      body[f.key] = f.number ? (v ? Number(v) : undefined) : v;
    }
    try {
      if (editingId) await api(r.path + '/' + editingId, { method: 'PUT', body: JSON.stringify(body) });
      else await api(r.path, { method: 'POST', body: JSON.stringify(body) });
      reset();
      loadAll();
    } catch (e) { msg.textContent = e.message; }
  });

  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTo(t.dataset.res));
  $('cancel').onclick = reset;
  $('search').onclick = findById;
  $('all').onclick = () => { $('search-id').value = ''; loadAll(); };
  $('search-id').addEventListener('keydown', e => { if (e.key === 'Enter') findById(); });
  switchTo('cars');
</script>
</body>
</html>
`;

app.get('/', (req, res) => res.type('html').send(page));

// ---------- Общие помощники ----------
const validId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid id' });
    return null;
  }
  return id;
};

const dbError = (res, error) => {
  if (error.code === '23505') {
    return res.status(409).json({ message: 'Такая запись уже существует (email должен быть уникальным)' });
  }
  res.status(500).json({ message: error.message });
};

// ---------- API: машины (таблица "cars") ----------
app.post('/cars', async (req, res) => {
  const { brand, model, year } = req.body;
  if (typeof brand !== 'string' || !brand.trim() || typeof model !== 'string' || !model.trim()) {
    return res.status(400).json({ message: 'Brand and model are required' });
  }

  const car = { brand: brand.trim(), model: model.trim() };
  if (year !== undefined && year !== null && year !== '') car.year = Number(year);

  const { data, error } = await supabase.from('cars').insert(car).select().single();
  if (error) return dbError(res, error);
  res.status(201).json(data);
});

app.get('/cars', async (req, res) => {
  const { data, error } = await supabase.from('cars').select('*').order('id');
  if (error) return dbError(res, error);
  res.json(data);
});

app.get('/cars/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const { data, error } = await supabase.from('cars').select('*').eq('id', id).maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'Car not found' });
  res.json(data);
});

app.put('/cars/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const updates = {};
  for (const field of ['brand', 'model']) {
    if (req.body[field] !== undefined) updates[field] = String(req.body[field]).trim();
  }
  if (req.body.year !== undefined) updates.year = req.body.year === '' || req.body.year === null ? null : Number(req.body.year);
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No fields to update' });

  const { data, error } = await supabase.from('cars').update(updates).eq('id', id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'Car not found' });
  res.json(data);
});

app.delete('/cars/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const { data, error } = await supabase.from('cars').delete().eq('id', id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'Car not found' });
  res.json(data);
});

// ---------- API: пользователи (таблица "users") ----------
const USER_FIELDS = ['first_name', 'last_name', 'email', 'phone'];

const pickUser = (body = {}) => {
  const data = {};
  for (const f of USER_FIELDS) {
    if (body[f] !== undefined) data[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }
  return data;
};

app.post('/users', async (req, res) => {
  const user = pickUser(req.body);
  if (!user.first_name || !user.last_name || !user.email) {
    return res.status(400).json({ message: 'first_name, last_name and email are required' });
  }
  const { data, error } = await supabase.from('users').insert(user).select().single();
  if (error) return dbError(res, error);
  res.status(201).json(data);
});

app.get('/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').order('id');
  if (error) return dbError(res, error);
  res.json(data);
});

app.get('/users/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
});

app.put('/users/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const updates = pickUser(req.body);
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No fields to update' });

  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
});

app.delete('/users/:id', async (req, res) => {
  const id = validId(req, res); if (id === null) return;
  const { data, error } = await supabase.from('users').delete().eq('id', id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ message: 'User not found' });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});