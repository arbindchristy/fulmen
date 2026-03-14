import { createApp } from './app/create-app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = createApp(env);

app.listen(env.port, () => {
  console.log(`Fulmen API listening on http://localhost:${env.port}`);
});
