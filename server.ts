import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { MultiplayerServer } from './server/multiplayer.ts';

const app = express();
const port = 3000;

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'KNOCKOUT ARENA Server' });
});

const server = http.createServer(app);

// WebSocket server on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });
const mpServer = new MultiplayerServer();

wss.on('connection', (ws) => {
  mpServer.handleConnection(ws);
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`KNOCKOUT ARENA server listening on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
