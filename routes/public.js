const express = require('express');
const { db } = require('../lib/database');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/home', { title: res.locals.t('home.title') });
});

router.get('/galerie', (req, res) => {
  res.render('pages/gallery', { title: res.locals.t('gallery.title') });
});

router.get('/contact', (req, res) => {
  res.render('pages/contact', { title: res.locals.t('contact.title') });
});

router.get('/cont', requireLogin, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.session.userId);
  res.render('pages/account', { title: res.locals.t('nav.account'), user });
});

router.get('/blog', (req, res) => {
  const posts = db
    .prepare(
      `SELECT id, title, slug, excerpt, image_url, created_at FROM posts WHERE published = 1 ORDER BY datetime(created_at) DESC`
    )
    .all();
  res.render('pages/blog-list', { title: res.locals.t('blog.title'), posts });
});

router.get('/blog/:slug', (req, res) => {
  const post = db
    .prepare(`SELECT * FROM posts WHERE slug = ? AND published = 1`)
    .get(req.params.slug);
  if (!post) return res.status(404).render('pages/404', { title: '404' });
  res.render('pages/blog-detail', { title: post.title, post });
});

module.exports = router;
