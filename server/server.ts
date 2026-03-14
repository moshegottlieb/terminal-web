import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const ROOT = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const filePath = path.join(ROOT, url.pathname);

  // If the path points to an existing file, serve it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Otherwise, serve index.html (SPA fallback, like CloudFront 404 → /)
  const indexPath = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fs.createReadStream(indexPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Accepting connections at http://localhost:${PORT}`);
});
