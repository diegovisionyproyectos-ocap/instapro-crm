import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COORDS_PATH = path.resolve(__dirname, 'src/utils/pdfCoords.json');
const RECEIPT_COORDS_PATH = path.resolve(__dirname, 'src/utils/receiptCoords.json');

function parseRequestUrl(reqUrl = '/api/coords') {
  return new URL(reqUrl, 'http://localhost');
}

function isCoordsRequest(reqUrl = '/api/coords') {
  return parseRequestUrl(reqUrl).pathname === '/api/coords';
}

function getCoordsPath(reqUrl = '/api/coords') {
  const url = parseRequestUrl(reqUrl);
  return url.searchParams.get('type') === 'recibo'
    ? RECEIPT_COORDS_PATH
    : COORDS_PATH;
}

function coordsPlugin() {
  return {
    name: 'coords-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const fullUrl = req.originalUrl || req.url || '';
        if (!isCoordsRequest(fullUrl)) return next();

        const coordsPath = getCoordsPath(fullUrl);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(coordsPath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const current = JSON.parse(fs.readFileSync(coordsPath, 'utf-8'));
              const merged = { ...current };

              for (const [key, val] of Object.entries(parsed)) {
                if (val && typeof val === 'object' && 'x' in val && 'y' in val) {
                  merged[key] = { ...(merged[key] || {}), x: val.x, y: val.y };
                } else {
                  merged[key] = val;
                }
              }

              fs.writeFileSync(coordsPath, JSON.stringify(merged, null, 2), 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, saved: Object.keys(parsed).length }));
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), coordsPlugin()],
});
