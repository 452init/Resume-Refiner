import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import refineHandler from './api/refine.js';

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/refine', (request, nativeResponse, next) => {
        const response = {
          setHeader: nativeResponse.setHeader.bind(nativeResponse),
          status(statusCode) {
            nativeResponse.statusCode = statusCode;
            return response;
          },
          json(payload) {
            nativeResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
            nativeResponse.end(JSON.stringify(payload));
            return response;
          }
        };

        Promise.resolve(refineHandler(request, response)).catch(next);
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()]
});
