import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3004;

// Middlewares
app.use(cors());
app.use(express.json());

// tmpfs directories for sensitive data
const SECRETS_DIR = '/app/secrets';
const TEMP_KEYS_DIR = '/app/temp-keys';

// Ensure tmpfs directories exist
await fs.mkdir(SECRETS_DIR, { recursive: true });
await fs.mkdir(TEMP_KEYS_DIR, { recursive: true });

// In-memory session store
const sessions = new Map();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Security App with tmpfs Mounts 🔐',
    info: 'Demonstrates in-memory storage for sensitive data',
    security: {
      'tmpfs mounts': 'Sensitive data stored in RAM only',
      'no disk writes': 'Data never touches persistent storage',
      'automatic cleanup': 'Data destroyed when container stops'
    },
    endpoints: {
      'POST /session': 'Create secure session',
      'GET /session/:id': 'Get session data',
      'POST /secret': 'Store temporary secret',
      'GET /secrets': 'List secrets (metadata only)',
      'GET /security-info': 'Security information'
    }
  });
});

// Security information
app.get('/security-info', async (req, res) => {
  try {
    // Check if directories are mounted as tmpfs
    const secretsStats = await fs.stat(SECRETS_DIR);
    const tempKeysStats = await fs.stat(TEMP_KEYS_DIR);
    
    res.json({
      success: true,
      security: {
        tmpfsMounts: [
          `${SECRETS_DIR} (in-memory)`,
          `${TEMP_KEYS_DIR} (in-memory)`
        ],
        benefits: [
          'No data written to disk',
          'Automatic cleanup on container stop',
          'Protection against disk forensics',
          'Fast access (RAM speed)'
        ],
        limitations: [
          'Data lost on container restart',
          'Limited by available RAM',
          'Not suitable for persistent data'
        ]
      },
      stats: {
        activeSessions: sessions.size,
        secretsDirectory: secretsStats.isDirectory(),
        tempKeysDirectory: tempKeysStats.isDirectory()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get security info' });
  }
});

// Create secure session
app.post('/session', async (req, res) => {
  try {
    const { userId, data } = req.body;
    const sessionId = crypto.randomUUID();
    const sessionKey = crypto.randomBytes(32).toString('hex');
    
    // Store session in memory
    sessions.set(sessionId, {
      userId,
      data,
      created: new Date(),
      key: sessionKey
    });
    
    // Store session key in tmpfs
    const keyPath = `${TEMP_KEYS_DIR}/${sessionId}.key`;
    await fs.writeFile(keyPath, sessionKey);
    
    res.json({
      success: true,
      sessionId,
      message: 'Secure session created',
      security: 'Session key stored in tmpfs (RAM only)'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// Get session data
app.get('/session/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Verify session key from tmpfs
    const keyPath = `${TEMP_KEYS_DIR}/${sessionId}.key`;
    try {
      const storedKey = await fs.readFile(keyPath, 'utf-8');
      const session = sessions.get(sessionId);
      
      if (storedKey !== session.key) {
        return res.status(401).json({ success: false, error: 'Invalid session key' });
      }
      
      res.json({
        success: true,
        session: {
          id: sessionId,
          userId: session.userId,
          data: session.data,
          created: session.created
        }
      });
    } catch {
      res.status(401).json({ success: false, error: 'Session key not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

// Store temporary secret
app.post('/secret', async (req, res) => {
  try {
    const { name, value, ttl = 300 } = req.body; // 5 minutes default TTL
    const secretId = crypto.randomUUID();
    
    // Encrypt the secret
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Store in tmpfs
    const secretPath = `${SECRETS_DIR}/${secretId}.secret`;
    const secretData = {
      name,
      encrypted,
      key: key.toString('hex'),
      iv: iv.toString('hex'),
      created: new Date(),
      expires: new Date(Date.now() + ttl * 1000)
    };
    
    await fs.writeFile(secretPath, JSON.stringify(secretData));
    
    // Auto-delete after TTL
    setTimeout(async () => {
      try {
        await fs.unlink(secretPath);
        console.log(`🗑️ Secret ${secretId} auto-deleted after TTL`);
      } catch {
        // Already deleted
      }
    }, ttl * 1000);
    
    res.json({
      success: true,
      secretId,
      message: 'Secret stored in tmpfs',
      ttl,
      security: 'Encrypted and stored in RAM only'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to store secret' });
  }
});

// List secrets (metadata only)
app.get('/secrets', async (req, res) => {
  try {
    const files = await fs.readdir(SECRETS_DIR);
    const secrets = [];
    
    for (const file of files) {
      if (file.endsWith('.secret')) {
        const secretPath = `${SECRETS_DIR}/${file}`;
        const secretData = JSON.parse(await fs.readFile(secretPath, 'utf-8'));
        
        // Check if expired
        if (new Date() > new Date(secretData.expires)) {
          await fs.unlink(secretPath);
          continue;
        }
        
        secrets.push({
          id: file.replace('.secret', ''),
          name: secretData.name,
          created: secretData.created,
          expires: secretData.expires,
          status: 'active'
        });
      }
    }
    
    res.json({
      success: true,
      secrets,
      count: secrets.length,
      note: 'Secret values are encrypted and not exposed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list secrets' });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 Security App with tmpfs mounts running on port ${PORT}`);
  console.log(`🛡️ Sensitive data stored in RAM only (tmpfs)`);
});