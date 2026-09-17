// Local development entry. On Vercel this file is NOT used — api/index.js is the
// serverless handler. Locally we load the same app and add static file serving.
const path = require('path');
const express = require('express');
const app = require('./api/index');

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8788;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin  (user: admin, password: ${process.env.ADMIN_PASSWORD || 'ADMIN336'})`);
});
