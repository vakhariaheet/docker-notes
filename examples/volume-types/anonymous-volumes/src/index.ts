import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(cors());
app.use(express.json());

// Cache directory (anonymous volume)
const CACHE_DIR = '/app/cache';
const TEMP_DIR = '/app/temp';

// Ensure cache directories exist
await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.mkdir(TEMP_DIR, { recursive: true });

// In-memory cache for demonstration
const memoryCache = new Map();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Cache App with Anonymous Volumes 🗄️',
    info: 'Demonstrates temporary storage that exists only during container lifetime',
    endpoints: {
      'GET /cache': 'List cached items',
      'POST /cache/:key': 'Store item in cache',
      'GET /cache/:key': 'Retrieve cached item',
      'DELETE /cache/:key': 'Remove cached item',
      'GET /stats': 'Cache statistics'
    }
  });
});

// Cache statistics
app.get('/stats', async (req, res) => {
  try {
    const cacheFiles = await fs.readdir(CACHE_DIR);
    const tempFiles = await fs.readdir(TEMP_DIR);
    
    let totalCacheSize = 0;
    for (const file of cacheFiles) {
      const stats = await fs.stat(path.join(CACHE_DIR, file));
      totalCacheSize += stats.size;
    }
    
    res.json({
      success: true,
      cache: {
        fileCount: cacheFiles.length,
        memoryCount: memoryCache.size,
        totalSize: totalCacheSize,
        tempFiles: tempFiles.length
      },
      volumes: {
        cache: `${CACHE_DIR} (anonymous volume)`,
        temp: `${TEMP_DIR} (anonymous volume)`,
        note: 'Data will be lost when container is removed'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// List cached items
app.get('/cache', async (req, res) => {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const cacheItems = [];
    
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fs.stat(filePath);
      cacheItems.push({
        key: file,
        size: stats.size,
        created: stats.birthtime,
        type: 'file'
      });
    }
    
    // Add memory cache items
    for (const [key, value] of memoryCache.entries()) {
      cacheItems.push({
        key,
        size: JSON.stringify(value).length,
        created: new Date(),
        type: 'memory'
      });
    }
    
    res.json({
      success: true,
      items: cacheItems,
      count: cacheItems.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list cache' });
  }
});

// Store item in cache
app.post('/cache/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const { data, type = 'file' } = req.body;
    
    if (type === 'memory') {
      memoryCache.set(key, data);
      res.json({
        success: true,
        message: 'Item cached in memory',
        key,
        type: 'memory'
      });
    } else {
      const filePath = path.join(CACHE_DIR, key);
      await fs.writeFile(filePath, JSON.stringify(data));
      
      res.json({
        success: true,
        message: 'Item cached to file',
        key,
        type: 'file',
        path: filePath
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cache item' });
  }
});

// Retrieve cached item
app.get('/cache/:key', async (req, res) => {
  try {
    const key = req.params.key;
    
    // Check memory cache first
    if (memoryCache.has(key)) {
      return res.json({
        success: true,
        key,
        data: memoryCache.get(key),
        type: 'memory'
      });
    }
    
    // Check file cache
    const filePath = path.join(CACHE_DIR, key);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      res.json({
        success: true,
        key,
        data: JSON.parse(data),
        type: 'file'
      });
    } catch {
      res.status(404).json({ success: false, error: 'Cache item not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve cache item' });
  }
});

// Remove cached item
app.delete('/cache/:key', async (req, res) => {
  try {
    const key = req.params.key;
    let removed = false;
    
    // Remove from memory cache
    if (memoryCache.has(key)) {
      memoryCache.delete(key);
      removed = true;
    }
    
    // Remove from file cache
    const filePath = path.join(CACHE_DIR, key);
    try {
      await fs.unlink(filePath);
      removed = true;
    } catch {
      // File doesn't exist
    }
    
    if (removed) {
      res.json({ success: true, message: 'Cache item removed' });
    } else {
      res.status(404).json({ success: false, error: 'Cache item not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove cache item' });
  }
});

app.listen(PORT, () => {
  console.log(`🗄️ Cache App running on port ${PORT}`);
  console.log(`📁 Using anonymous volumes for temporary storage`);
});