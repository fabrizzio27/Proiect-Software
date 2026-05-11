const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL === '1';
const dataDir = isVercel
  ? path.join('/tmp', 'goleador-data')
  : path.join(__dirname, '..', 'data');

let _db;

function openDatabase() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const Database = require('better-sqlite3');
  const dbPath = path.join(dataDir, 'site.db');
  const database = new Database(dbPath);

  if (isVercel) {
    database.pragma('journal_mode = MEMORY');
    database.pragma('synchronous = OFF');
    database.pragma('temp_store = MEMORY');
  } else {
    database.pragma('journal_mode = WAL');
  }

  database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    body TEXT NOT NULL,
    image_url TEXT,
    video_embed TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

  seedIfEmpty(database);
  return database;
}

function getDb() {
  if (!_db) {
    _db = openDatabase();
  }
  return _db;
}

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'articol';
}

function migrateUsers(database) {
  database.prepare(`UPDATE users SET role = 'user' WHERE email != ?`).run('admin@site.local');
  database.prepare(`UPDATE users SET role = 'admin' WHERE email = ?`).run('admin@site.local');
}

function seedFootballPosts(database) {
  const insertPost = database.prepare(`
    INSERT INTO posts (title, slug, excerpt, body, image_url, video_embed, published, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  const posts = [
    [
      'Lionel Messi — magia din piciorul stâng',
      'lionel-messi',
      'Campion mondial cu Argentina (2022), multiple Balon d’Or, stil unic pe teren.',
      '<p><strong>Lionel Messi</strong> a marcat istoria fotbalului modern prin dribling, viziune și goluri decisive. După triumful de la Qatar, discuția „GOAT” capătă noi argumente în favoarea argentinianului.</p><p>Pe acest fanpage îl sărbătorim pe Messi alături de alte legende ale terenului.</p>',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900',
      null,
    ],
    [
      'Cristiano Ronaldo — disciplină și recorduri',
      'cristiano-ronaldo',
      'CR7: goluri la toate marile campionate, mentalitate de învingător și fizic impecabil.',
      '<p><strong>Cristiano Ronaldo</strong> continuă să redefinească limitele vârstei în fotbalul de top. Palmaresul său în Champions League și la naționala Portugaliei vorbește de la sine.</p><p>Fanii îl admiră pentru munca din spatele scenei, nu doar pentru spectacolul din teren.</p>',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=900',
      null,
    ],
    [
      'Kylian Mbappé — viteză și viitor',
      'kylian-mbappe',
      'Unul dintre cei mai rapizi atacanți din lume, decisiv la naționala Franței.',
      '<p><strong>Kylian Mbappé</strong> combină explozia fizică cu calm la finalizare. De la titlul mondial din 2018 până la evoluțiile recente, rămâne o față a fotbalului european.</p><p>Îl urmărim cu nerăbdare în fiecare sezon.</p>',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900',
      null,
    ],
    [
      'Erling Haaland — mașina de goluri',
      'erling-haaland',
      'Atacant nordic cu cifre extraterestre în Premier League și Champions League.',
      '<p><strong>Erling Haaland</strong> impresionează prin poziționare, șut puternic și eficiență în careu. Este tipul de „number nine” care transformă ocaziile în goluri aproape mecanic.</p>',
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=900',
      null,
    ],
    [
      'Neymar Jr — creativitate și spectacol',
      'neymar-jr',
      'Brazilianul care a adus samba pe stadioanele Europei.',
      '<p><strong>Neymar</strong> a fost în centrul generației de aur a Braziliei din ultimul deceniu. Driblingurile sale și pasa decisivă fac din el un jucător iubit de fanii de spectacol.</p>',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900',
      null,
    ],
    [
      'Luka Modrić — eleganța la mijlocul terenului',
      'luka-modric',
      'Balon d’Or 2018, creierul Croației finalistă la Cupa Mondială.',
      '<p><strong>Luka Modrić</strong> arată că inteligența tactică și tehnica rafinată pot domina meciuri fără neapărat să marchezi zeci de goluri pe an.</p><p>Un model pentru orice copil care vrea să joace la mijloc.</p>',
      'https://images.unsplash.com/photo-1560272564-c83b66d1d192?w=900',
      null,
    ],
  ];

  for (const row of posts) insertPost.run(...row);
}

function upgradeLegacyWelcomePost(database) {
  const n = database.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  if (n !== 1) return;
  const p = database.prepare('SELECT slug FROM posts LIMIT 1').get();
  if (p && p.slug === 'bun-venit-pe-site') {
    database.exec('DELETE FROM posts');
    seedFootballPosts(database);
  }
}

function seedIfEmpty(database) {
  migrateUsers(database);

  const userCount = database.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    database
      .prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`)
      .run('admin@site.local', hash, 'Administrator', 'admin');
  }

  const postCount = database.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  if (postCount === 0) {
    seedFootballPosts(database);
  } else {
    upgradeLegacyWelcomePost(database);
  }
}

const db = new Proxy(
  {},
  {
    get(_, prop) {
      const instance = getDb();
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }
);

module.exports = { db, slugify };
