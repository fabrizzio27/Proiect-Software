const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../lib/database');
const { allowed } = require('../lib/i18n');

const router = express.Router();

function redirectIfLoggedIn(req, res, next) {
  if (!req.session?.userId) return next();
  const user = db.prepare('SELECT email, role FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return req.session.destroy(() => next());
  }
  const isAdmin = user.email === 'admin@site.local' && user.role === 'admin';
  return res.redirect(isAdmin ? '/admin' : '/cont');
}

router.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('auth/login', {
    title: res.locals.t('nav.login'),
    error: null,
    registered: req.query.registered === '1',
    nextUrl: req.query.next || '/',
  });
});

router.post('/login', (req, res) => {
  const { email, password, next: nextUrl } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.trim()?.toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).render('auth/login', {
      title: res.locals.t('nav.login'),
      error: res.locals.t('auth.invalid'),
      registered: false,
      nextUrl: nextUrl || '/',
    });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role;

  const safe = typeof nextUrl === 'string' && nextUrl.startsWith('/') && !nextUrl.startsWith('//');
  const isAdmin = user.email === 'admin@site.local' && user.role === 'admin';

  if (isAdmin) {
    const dest = safe ? nextUrl : '/admin';
    return res.redirect(dest);
  }

  if (safe && nextUrl.startsWith('/admin')) {
    return res.redirect('/cont');
  }
  const dest = safe ? nextUrl : '/cont';
  res.redirect(dest);
});

router.get('/inregistrare', redirectIfLoggedIn, (req, res) => {
  res.render('auth/signup', { title: res.locals.t('nav.signup'), error: null });
});

router.post('/inregistrare', (req, res) => {
  const { name, email, password, password2 } = req.body;
  if (!name || !email || !password) {
    return res.status(400).render('auth/signup', {
      title: res.locals.t('nav.signup'),
      error: res.locals.t('auth.fillAll'),
    });
  }
  if (password !== password2) {
    return res.status(400).render('auth/signup', {
      title: res.locals.t('nav.signup'),
      error: res.locals.t('auth.passwordMismatch'),
    });
  }
  if (password.length < 6) {
    return res.status(400).render('auth/signup', {
      title: res.locals.t('nav.signup'),
      error: res.locals.t('auth.passwordShort'),
    });
  }
  const em = email.trim().toLowerCase();
  if (em === 'admin@site.local') {
    return res.status(400).render('auth/signup', {
      title: res.locals.t('nav.signup'),
      error: res.locals.t('auth.adminReserved'),
    });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(em);
  if (exists) {
    return res.status(400).render('auth/signup', {
      title: res.locals.t('nav.signup'),
      error: res.locals.t('auth.emailTaken'),
    });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'user')`
  ).run(em, hash, name.trim());
  res.redirect('/login?registered=1');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

router.get('/set-limba/:lang', (req, res) => {
  const lang = req.params.lang;
  if (allowed.includes(lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  }
  const back = req.get('referer') || '/';
  res.redirect(back);
});

module.exports = router;
