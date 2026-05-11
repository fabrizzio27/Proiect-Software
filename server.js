const app = require('./app');

const PORT = Number(process.env.PORT);
const port = Number.isFinite(PORT) && PORT > 0 ? PORT : process.env.RENDER === 'true' ? 10000 : 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${port} (PORT=${process.env.PORT || 'unset'})`);
  console.log('GOLEADOR — admin: admin@site.local / admin123');
});
