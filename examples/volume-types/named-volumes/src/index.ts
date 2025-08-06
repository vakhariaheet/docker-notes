import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// File storage configuration
const storage = multer.diskStorage({
  destination: '/app/uploads', // Named volume mount point
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Ensure uploads directory exists
await fs.mkdir('/app/uploads', { recursive: true });

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'File Storage API with Named Volumes 📁',
    endpoints: {
      'GET /files': 'List all files',
      'POST /upload': 'Upload a file',
      'GET /files/:filename': 'Download a file',
      'DELETE /files/:filename': 'Delete a file'
    }
  });
});

// List all files
app.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir('/app/uploads');
    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join('/app/uploads', filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
    );
    
    res.json({
      success: true,
      files: fileDetails,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list files' });
  }
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    message: 'File uploaded successfully',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    }
  });
});

// Download file
app.get('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/app/uploads', filename);
    
    await fs.access(filePath);
    res.download(filePath);
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// Delete file
app.delete('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/app/uploads', filename);
    
    await fs.unlink(filePath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`File Storage API running on port ${PORT} 📁`);
});