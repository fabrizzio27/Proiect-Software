const { db } = require('../lib/database');

function isAdminUser(user) {
  return !!(user && user.email === 'admin@site.local' && user.role === 'admin');
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl || '/admin'));
  }
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.session.userId);
  if (!user || !isAdminUser(user)) {
    return res.status(403).render('pages/forbidden', { title: '403' });
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl || '/cont'));
  }
  next();
}

module.exports = { requireAdmin, requireLogin, isAdminUser };
