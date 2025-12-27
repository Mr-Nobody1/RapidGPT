/**
 * RapidGPT Development Server
 * A simple Bun server to serve the static files
 */

const PORT = 3000;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === '/') {
      path = '/index.html';
    }

    // Get file path
    const filePath = `.${path}`;

    // Try to serve the file
    const file = Bun.file(filePath);

    if (await file.exists()) {
      // Determine content type
      const ext = path.split('.').pop();
      const contentTypes: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon'
      };

      return new Response(file, {
        headers: {
          'Content-Type': contentTypes[ext || 'html'] || 'text/plain'
        }
      });
    }

    // 404 for missing files
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`
🚀 RapidGPT is running!

   ╔══════════════════════════════════════╗
   ║                                      ║
   ║   http://localhost:${PORT}              ║
   ║                                      ║
   ╚══════════════════════════════════════╝

   Lightning fast. Zero bloat. Pure performance.
`);
