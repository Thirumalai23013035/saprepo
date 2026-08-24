const app = require('./app');
const { connectDatabase } = require('./config/database');
const { port } = require('./config/env');

async function start() {
  await connectDatabase();
  app.listen(port, () => console.log(`Procurement match API listening on port ${port}`));
}

start().catch(error => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
