import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import chokidar from 'chokidar';

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Hot reload counter
let reloadCount = 0;
const startTime = new Date();

// Watch for file changes (development feature)
if (process.env.NODE_ENV === 'development') {
  const watcher = chokidar.watch('/app/src', {
    ignored: /node_modules/,
    persistent: true
  });
  
  watcher.on('change', (path) => {
    reloadCount++;
    console.log(`🔥 Hot reload #${reloadCount}: ${path} changed`);
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Development App with Hot Reloading 🔥',
    status: 'running',
    uptime: Math.floor((Date.now() - startTime.getTime()) / 1000),
    reloadCount,
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Hot reloading via bind mounts',
      'File watching',
      'Development tools',
      'Live code updates'
    ]
  });
});

// Development info endpoint
app.get('/dev-info', async (req, res) => {
  try {
    const packageJson = JSON.parse(await fs.readFile('/app/package.json', 'utf-8'));
    const srcFiles = await fs.readdir('/app/src');
    
    res.json({
      success: true,
      project: {
        name: packageJson.name,
        version: packageJson.version,
        scripts: packageJson.scripts
      },
      sourceFiles: srcFiles,
      mountedVolumes: {
        source: '/app/src (bind mount)',
        nodeModules: '/app/node_modules (volume)',
        package: '/app/package.json (bind mount)'
      },
      hotReload: {
        enabled: process.env.NODE_ENV === 'development',
        reloadCount,
        watchedPaths: ['/app/src']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get dev info' });
  }
});

// Code endpoint - shows current source code
app.get('/code/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = `/app/src/${filename}`;
    const code = await fs.readFile(filePath, 'utf-8');
    
    res.json({
      success: true,
      filename,
      code,
      lastModified: (await fs.stat(filePath)).mtime
    });
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// Update code endpoint (for demonstration)
app.post('/update-message', (req, res) => {
  const { message } = req.body;
  
  // This would normally update a config file or database
  // For demo, we'll just return the new message
  res.json({
    success: true,
    message: 'Message updated (simulated)',
    newMessage: message,
    note: 'In a real app, this would persist to a file or database'
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Development App with Hot Reloading running on port ${PORT}`);
  console.log(`📁 Source code mounted via bind mount for live updates`);
});