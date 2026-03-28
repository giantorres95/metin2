import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import app from './app';

const PORT = process.env.PORT || 3000;

// In production, serve the built client files
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));

  // SPA fallback: all non-API routes serve index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
