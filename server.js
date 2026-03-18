import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { createJsonStorage, StorageError } from './src/backend/storage.ts';
import {
  validateImportPayload,
  validateLoginPayload,
  validateSessionPayload,
  validateWorkoutPayload,
} from './src/backend/apiValidation.ts';
import { normalizeUsername } from './src/auth/username.ts';

const PORT = process.env.PORT || 3000;
const DIST_DIR = join(process.cwd(), 'dist');
const STORAGE_PATH = join(process.cwd(), 'data', 'storage.json');
const storage = createJsonStorage(STORAGE_PATH);

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

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(rawBody);
}

async function handleApiRequest(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = await readJsonBody(req);

    if (!validateLoginPayload(body)) {
      sendJson(res, 400, { error: 'Invalid login payload' });
      return true;
    }

    let username;
    try {
      username = normalizeUsername(body.username);
    } catch {
      sendJson(res, 400, { error: 'Invalid login payload' });
      return true;
    }

    await storage.ensureUser(username);
    sendJson(res, 200, { username });
    return true;
  }

  const match = url.pathname.match(
    /^\/api\/users\/([^/]+)\/(workouts|sessions|import)(?:\/([^/]+))?$/
  );

  if (!match) {
    return false;
  }

  const [, rawUsername, resource, resourceId] = match;
  const username = normalizeUsername(decodeURIComponent(rawUsername));

  if (resource === 'workouts' && req.method === 'GET' && !resourceId) {
    sendJson(res, 200, { workouts: await storage.getWorkouts(username) });
    return true;
  }

  if (resource === 'sessions' && req.method === 'GET' && !resourceId) {
    sendJson(res, 200, { sessions: await storage.getSessions(username) });
    return true;
  }

  if (resource === 'workouts' && req.method === 'PUT' && resourceId) {
    const body = await readJsonBody(req);
    if (!validateWorkoutPayload(body, resourceId)) {
      sendJson(res, 400, { error: 'Invalid workout payload' });
      return true;
    }

    await storage.upsertWorkout(username, body);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (resource === 'sessions' && req.method === 'PUT' && resourceId) {
    const body = await readJsonBody(req);
    if (!validateSessionPayload(body, resourceId)) {
      sendJson(res, 400, { error: 'Invalid session payload' });
      return true;
    }

    await storage.upsertSession(username, body);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (resource === 'workouts' && req.method === 'DELETE' && resourceId) {
    await storage.softDeleteWorkout(username, resourceId);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (resource === 'import' && req.method === 'POST' && !resourceId) {
    const body = await readJsonBody(req);
    if (!validateImportPayload(body)) {
      sendJson(res, 400, { error: 'Invalid import payload' });
      return true;
    }

    await storage.importUserData(username, body);
    sendJson(res, 200, { ok: true });
    return true;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
  return true;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  try {
    const handled = await handleApiRequest(req, res, url);
    if (handled) {
      return;
    }
  } catch (error) {
    if (error instanceof StorageError) {
      if (error.code === 'NOT_FOUND') {
        sendJson(res, 404, { error: error.message });
        return;
      }

      if (error.code === 'IMPORT_CONFLICT') {
        sendJson(res, 409, { error: error.message });
        return;
      }

      sendJson(res, 500, { error: error.message });
      return;
    }

    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: 'Server Error' });
    return;
  }

  // Parse URL and remove query strings
  let urlPath = url.pathname;

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
