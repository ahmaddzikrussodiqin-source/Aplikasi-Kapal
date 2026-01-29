import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
console.log('Checking dist folder...');
if (fs.existsSync(distPath)) {
  console.log('dist folder exists');
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:', files);
} else {
  console.error('dist folder does not exist!');
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router - send all non-API requests to React app
app.get('*', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

const PORT = process.env.PORT || 4173;
console.log(`PORT environment variable: ${process.env.PORT}`);
console.log(`Using port: ${PORT}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
