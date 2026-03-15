import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3005;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'multivolume_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Middlewares
app.use(cors());
app.use(express.json());

// Volume directories
const UPLOADS_DIR = '/app/uploads';        // Named volume
const CACHE_DIR = '/app/cache';            // Anonymous volume
const LOGS_DIR = '/app/logs';              // Named volume
const TEMP_DIR = '/app/temp';              // tmpfs
const CONFIG_DIR = '/app/config';          // Bind mount

// Ensure directories exist
await fs.mkdir(UPLOADS_DIR, { recursive: true });
await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.mkdir(LOGS_DIR, { recursive: true });
await fs.mkdir(TEMP_DIR, { recursive: true });

// File upload configuration
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_path VARCHAR(500) NOT NULL
      )
    `);
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
};

await initDB();

// Logging function
const logActivity = async (activity: string, details: any = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    activity,
    details
  };
  
  const logFile = path.join(LOGS_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Volume App 📦',
    info: 'Demonstrates all Docker volume types in one application',
    volumes: {
      'Named Volumes': {
        uploads: `${UPLOADS_DIR} - Persistent file storage`,
        logs: `${LOGS_DIR} - Application logs`
      },
      'Anonymous Volumes': {
        cache: `${CACHE_DIR} - Temporary cache data`
      },
      'tmpfs Mounts': {
        temp: `${TEMP_DIR} - In-memory temporary files`
      },
      'Bind Mounts': {
        config: `${CONFIG_DIR} - Configuration files`,
        source: '/app/src - Source code (development)'
      }
    },
    endpoints: {
      'POST /upload': 'Upload file (named volume)',
      'GET /files': 'List files from database',
      'GET /cache/:key': 'Get cached data (anonymous volume)',
      'POST /cache/:key': 'Store cached data',
      'GET /logs': 'View application logs (named volume)',
      'GET /temp-file': 'Create temporary file (tmpfs)',
      'GET /config': 'Read configuration (bind mount)',
      'GET /volume-info': 'Volume information'
    }
  });
});

// Volume information
app.get('/volume-info', async (req, res) => {
  try {
    const volumeInfo = {
      namedVolumes: {
        uploads: {
          path: UPLOADS_DIR,
          files: (await fs.readdir(UPLOADS_DIR)).length,
          persistent: true
        },
        logs: {
          path: LOGS_DIR,
          files: (await fs.readdir(LOGS_DIR)).length,
          persistent: true
        }
      },
      anonymousVolumes: {
        cache: {
          path: CACHE_DIR,
          files: (await fs.readdir(CACHE_DIR)).length,
          persistent: false,
          note: 'Exists only during container lifetime'
        }
      },
      tmpfsMounts: {
        temp: {
          path: TEMP_DIR,
          files: (await fs.readdir(TEMP_DIR)).length,
          storage: 'RAM only',
          note: 'Fastest access, no disk I/O'
        }
      },
      bindMounts: {
        config: {
          path: CONFIG_DIR,
          exists: await fs.access(CONFIG_DIR).then(() => true).catch(() => false),
          note: 'Direct host filesystem access'
        }
      }
    };
    
    await logActivity('volume-info-requested', volumeInfo);
    res.json({ success: true, volumes: volumeInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get volume info' });
  }
});

// File upload (Named Volume)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Store file info in database
    const result = await pool.query(
      'INSERT INTO files (filename, original_name, size, file_path) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.file.filename, req.file.originalname, req.file.size, req.file.path]
    );
    
    await logActivity('file-uploaded', {
      id: result.rows[0].id,
      filename: req.file.filename,
      size: req.file.size
    });
    
    res.json({
      success: true,
      message: 'File uploaded to named volume',
      file: {
        id: result.rows[0].id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        volume: 'named volume (persistent)'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// List files
app.get('/files', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM files ORDER BY upload_date DESC');
    res.json({
      success: true,
      files: result.rows,
      storage: 'Database + Named Volume'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

// Cache operations (Anonymous Volume)
app.post('/cache/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const { data } = req.body;
    
    const cachePath = path.join(CACHE_DIR, `${key}.cache`);
    await fs.writeFile(cachePath, JSON.stringify({ data, cached: new Date() }));
    
    await logActivity('cache-stored', { key, size: JSON.stringify(data).length });
    
    res.json({
      success: true,
      message: 'Data cached in anonymous volume',
      key,
      volume: 'anonymous volume (temporary)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Cache operation failed' });
  }
});

app.get('/cache/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const cachePath = path.join(CACHE_DIR, `${key}.cache`);
    
    const cacheData = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
    
    res.json({
      success: true,
      key,
      data: cacheData.data,
      cached: cacheData.cached,
      volume: 'anonymous volume'
    });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Cache key not found' });
  }
});

// Temporary file (tmpfs)
app.get('/temp-file', async (req, res) => {
  try {
    const tempId = Date.now().toString();
    const tempPath = path.join(TEMP_DIR, `temp-${tempId}.txt`);
    const tempData = `Temporary data created at ${new Date().toISOString()}`;
    
    await fs.writeFile(tempPath, tempData);
    
    // Auto-delete after 30 seconds
    setTimeout(async () => {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Already deleted
      }
    }, 30000);
    
    await logActivity('temp-file-created', { tempId, path: tempPath });
    
    res.json({
      success: true,
      message: 'Temporary file created in tmpfs',
      tempId,
      data: tempData,
      volume: 'tmpfs (RAM only)',
      autoDelete: '30 seconds'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create temp file' });
  }
});

// Configuration (Bind Mount)
app.get('/config', async (req, res) => {
  try {
    const configPath = path.join(CONFIG_DIR, 'app.json');
    
    try {
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      res.json({
        success: true,
        config,
        volume: 'bind mount (host filesystem)',
        note: 'Configuration can be updated on host'
      });
    } catch {
      // Create default config if not exists
      const defaultConfig = {
        appName: 'Multi-Volume App',
        version: '1.0.0',
        features: ['named-volumes', 'anonymous-volumes', 'tmpfs', 'bind-mounts']
      };
      
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      
      res.json({
        success: true,
        config: defaultConfig,
        volume: 'bind mount (created default)',
        note: 'Default configuration created'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read config' });
  }
});

// Application logs (Named Volume)
app.get('/logs', async (req, res) => {
  try {
    const logFiles = await fs.readdir(LOGS_DIR);
    const logs = [];
    
    for (const file of logFiles.slice(-5)) { // Last 5 log files
      const logPath = path.join(LOGS_DIR, file);
      const content = await fs.readFile(logPath, 'utf-8');
      const entries = content.trim().split('\n').map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
      
      logs.push({
        file,
        entries: entries.slice(-10) // Last 10 entries per file
      });
    }
    
    res.json({
      success: true,
      logs,
      volume: 'named volume (persistent)',
      note: 'Logs persist across container restarts'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read logs' });
  }
});

app.listen(PORT, () => {
  console.log(`📦 Multi-Volume App running on port ${PORT}`);
  console.log(`🔄 Using all Docker volume types for different purposes`);
});