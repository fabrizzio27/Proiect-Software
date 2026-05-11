const path = require('path');
const fs = require('fs');

const localesDir = path.join(__dirname, '..', 'locales');
const cache = {};

function loadLocale(code) {
  if (cache[code]) return cache[code];
  const file = path.join(localesDir, `${code}.json`);
  if (!fs.existsSync(file)) {
    cache[code] = loadLocale('ro');
    return cache[code];
  }
  cache[code] = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cache[code];
}

function t(lang, key, vars) {
  const dict = loadLocale(lang);
  let str = dict[key] ?? key;
  if (vars && typeof str === 'string') {
    Object.keys(vars).forEach((k) => {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]);
    });
  }
  return str;
}

const allowed = ['ro', 'en'];

module.exports = { loadLocale, t, allowed };
