import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/src/app.js';

let appPromise: Promise<ReturnType<(typeof import('express'))['default']>> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApp().then(({ app }) => app);
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req, res);
}
