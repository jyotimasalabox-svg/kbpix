const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolveFile(urlPath) {
  let clean = urlPath.split('?')[0];
  if (clean === '/' || clean === '') clean = '/index.html';

  const roots = [process.cwd(), __dirname];
  for (const root of roots) {
    try {
      let p = path.join(root, clean);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
      if (fs.existsSync(p + '.html') && fs.statSync(p + '.html').isFile()) return p + '.html';
      if (fs.existsSync(path.join(p, 'index.html'))) return path.join(p, 'index.html');
    } catch (e) {}
  }
  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Not Found</h1><p><a href="/">Back to Home</a></p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${err.message}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = server;
