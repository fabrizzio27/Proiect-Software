const { allowed, t } = require('../lib/i18n');

function localeMiddleware(req, res, next) {
  let lang = req.cookies?.lang;
  if (!allowed.includes(lang)) {
    const accept = (req.headers['accept-language'] || '').toLowerCase();
    lang = accept.startsWith('en') ? 'en' : 'ro';
  }
  res.locals.lang = lang;
  res.locals.t = (key, vars) => t(lang, key, vars);
  next();
}

module.exports = { localeMiddleware, allowed };
