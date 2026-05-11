const path = require('path');
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { localeMiddleware } = require('./middleware/locale');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { db } = require('./lib/database');
const { isAdminUser } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');

if (process.env.VERCEL === '1' || process.env.RENDER === 'true' || process.env.RAILWAY_ENVIRONMENT) {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(localeMiddleware);

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-schimbati-in-productie',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure:
        process.env.VERCEL === '1' ||
        process.env.RENDER === 'true' ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.NODE_ENV === 'production',
    },
  })
);

app.use((req, res, next) => {
  if (!req.session?.userId) {
    res.locals.sessionUser = null;
    return next();
  }
  const user = db.prepare('SELECT id, name, role, email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    res.locals.sessionUser = null;
    return req.session.destroy(() => next());
  }
  req.session.userName = user.name;
  req.session.userRole = user.role;
  res.locals.sessionUser = {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    isAdmin: isAdminUser(user),
  };
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(authRoutes);
app.use(publicRoutes);
app.use('/admin', adminRoutes);

app.get('/signup', (req, res) => res.redirect('/inregistrare'));

app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404' });
});

module.exports = app;
