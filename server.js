import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

const PORT = process.env.PORT || 3000;
const DIST_DIR = join(process.cwd(), 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function handleRequest(req, res) {
  // Parse URL and remove query strings
  let urlPath = req.url.split('?')[0];

  // Default to index.html for SPA routing
  let filePath = urlPath === '/' ? '/index.html' : urlPath;

  // Build full path
  const fullPath = join(DIST_DIR, filePath);

  try {
    // Check if file exists, otherwise serve index.html (SPA fallback)
    await stat(fullPath);
  } catch {
    // For SPA, serve index.html for any route
    const indexPath = join(DIST_DIR, 'index.html');
    const content = await readFile(indexPath);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
    return;
  }

  // Get file extension
  const ext = extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = await readFile(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Server Error');
  }
}

createServer(handleRequest).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
