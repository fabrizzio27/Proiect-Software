const express = require('express');
const bcrypt = require('bcryptjs');
const { db, slugify } = require('../lib/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

function uniqueSlug(base, excludeId) {
  let s = slugify(base);
  let candidate = s;
  let n = 2;
  while (true) {
    const row = db.prepare('SELECT id FROM posts WHERE slug = ?').get(candidate);
    if (!row || (excludeId && row.id === excludeId)) return candidate;
    candidate = `${s}-${n++}`;
  }
}

router.get('/', (req, res) => {
  const stats = {
    posts: db.prepare('SELECT COUNT(*) AS c FROM posts').get().c,
    users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
    published: db.prepare('SELECT COUNT(*) AS c FROM posts WHERE published = 1').get().c,
  };
  res.render('admin/dashboard', { title: res.locals.t('admin.dashboard'), stats });
});

router.get('/articole', (req, res) => {
  const posts = db
    .prepare(
      `SELECT id, title, slug, published, created_at, updated_at FROM posts ORDER BY datetime(updated_at) DESC`
    )
    .all();
  res.render('admin/posts-list', { title: res.locals.t('admin.posts'), posts });
});

router.get('/articole/nou', (req, res) => {
  res.render('admin/post-form', {
    title: res.locals.t('admin.posts'),
    post: null,
    error: null,
  });
});

router.post('/articole/nou', (req, res) => {
  const { title, excerpt, body, image_url, video_embed, published } = req.body;
  if (!title || !body) {
    return res.status(400).render('admin/post-form', {
      title: res.locals.t('admin.posts'),
      post: { ...req.body, id: null },
      error: res.locals.lang === 'en' ? 'Title and body are required.' : 'Titlul și conținutul sunt obligatorii.',
    });
  }
  const slug = uniqueSlug(title);
  const pub = published === 'on' || published === '1' || published === true ? 1 : 0;
  const r = db
    .prepare(
      `INSERT INTO posts (title, slug, excerpt, body, image_url, video_embed, published, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      title.trim(),
      slug,
      (excerpt || '').trim(),
      body.trim(),
      (image_url || '').trim() || null,
      (video_embed || '').trim() || null,
      pub
    );
  res.redirect(`/admin/articole/${r.lastInsertRowid}/editare`);
});

router.get('/articole/:id/editare', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).send('Not found');
  res.render('admin/post-form', { title: post.title, post, error: null });
});

router.post('/articole/:id/editare', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!existing) return res.status(404).send('Not found');

  const { title, excerpt, body, image_url, video_embed, published, slug: customSlug } = req.body;
  if (!title || !body) {
    return res.status(400).render('admin/post-form', {
      title: res.locals.t('admin.posts'),
      post: { ...existing, ...req.body, id },
      error: res.locals.lang === 'en' ? 'Title and body are required.' : 'Titlul și conținutul sunt obligatorii.',
    });
  }
  let slug = customSlug ? slugify(customSlug) : slugify(title);
  const clash = db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').get(slug, id);
  if (clash) slug = uniqueSlug(slug, id);

  const pub = published === 'on' || published === '1' || published === true ? 1 : 0;
  db.prepare(
    `UPDATE posts SET title = ?, slug = ?, excerpt = ?, body = ?, image_url = ?, video_embed = ?, published = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title.trim(),
    slug,
    (excerpt || '').trim(),
    body.trim(),
    (image_url || '').trim() || null,
    (video_embed || '').trim() || null,
    pub,
    id
  );
  res.redirect('/admin/articole');
});

router.post('/articole/:id/stergere', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.redirect('/admin/articole');
});

router.get('/setari', (req, res) => {
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.session.userId);
  res.render('admin/settings', {
    title: res.locals.t('admin.settings'),
    user,
    message: null,
    error: null,
  });
});

router.post('/setari/parola', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const { current, password, password2 } = req.body;
  const fail = (error) =>
    res.status(400).render('admin/settings', {
      title: res.locals.t('admin.settings'),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: null,
      error,
    });

  if (!current || !password) {
    return fail(res.locals.lang === 'en' ? 'Fill current and new password.' : 'Completează parola curentă și cea nouă.');
  }
  if (password !== password2) {
    return fail(res.locals.t('auth.passwordMismatch'));
  }
  if (password.length < 6) {
    return fail(res.locals.t('auth.passwordShort'));
  }
  if (!bcrypt.compareSync(current, user.password_hash)) {
    return fail(res.locals.lang === 'en' ? 'Current password is wrong.' : 'Parola curentă este incorectă.');
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.render('admin/settings', {
    title: res.locals.t('admin.settings'),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    message: res.locals.lang === 'en' ? 'Password updated.' : 'Parola a fost actualizată.',
    error: null,
  });
});

module.exports = router;
