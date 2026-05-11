const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log('GOLEADOR — admin: admin@site.local / admin123');
});
