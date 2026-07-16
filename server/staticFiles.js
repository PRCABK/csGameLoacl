const fs = require('fs');
const path = require('path');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.glb': 'model/gltf-binary',
  '.obj': 'text/plain',
  '.mtl': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function createStaticFileHandler(root) {
  return (req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const safe = path.normalize(file).replace(/^([.][.][/\\])+/, '');
    fs.readFile(path.join(root, safe), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(safe)] || 'application/octet-stream' });
      res.end(data);
    });
  };
}

module.exports = { createStaticFileHandler };
