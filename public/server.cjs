/**
 * 生产静态服务器（V2.1.1）：为 dist 提供 gzip 压缩与长缓存。
 * 线上原始 JS 约 1.33MB，未压缩下载需 40—90 秒；gzip 后约 436KB。
 * 用法：node server.cjs（监听 PORT，默认 3000）
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
const gzipCache = new Map();

function gzipFor(file, data) {
  const key = `${file}:${data.length}`;
  if (gzipCache.has(key)) return gzipCache.get(key);
  const gz = zlib.gzipSync(data, { level: 9 });
  gzipCache.set(key, gz);
  return gz;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const file = path.normalize(path.join(root, urlPath));

  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const index = path.join(root, 'index.html');
    const data = fs.readFileSync(index);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': data.length });
    res.end(data);
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(file);
  const accept = String(req.headers['accept-encoding'] || '');
  const compressible = ['.js', '.css', '.html', '.json', '.svg'].includes(ext) && data.length > 1024;
  const immutable = urlPath.startsWith('/assets/');
  const cacheControl = immutable ? 'public, max-age=31536000, immutable' : 'no-cache';

  if (compressible && accept.includes('gzip')) {
    const gz = gzipFor(file, data);
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Encoding': 'gzip',
      'Content-Length': gz.length,
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding',
    });
    res.end(gz);
  } else {
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': cacheControl,
    });
    res.end(data);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`serving ${root} on ${port}`);
});
