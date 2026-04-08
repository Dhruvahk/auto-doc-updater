import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import analysisRoutes from './routes/analysis.js';
import githubRoutes from './routes/github.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Rate limiting — generous for hackathon, tighten for prod
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests — slow down a bit.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/github', githubRoutes);

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Auto Doc Updater API</title></head><body><p>This URL is the <strong>API only</strong>. Open your Vercel site for the web app.</p><p>Try <a href="/api/health">/api/health</a>.</p></body></html>`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    groqConfigured: !!process.env.GROQ_API_KEY,
    githubConfigured: !!process.env.GITHUB_TOKEN,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  let msg = err?.message || 'Internal server error';
  if (typeof msg !== 'string') {
    try {
      msg = JSON.stringify(msg);
    } catch {
      msg = 'Internal server error';
    }
  }
  if (!msg || msg === '[object Object]') {
    msg = 'Internal server error';
  }
  res.status(err.status || 500).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Auto Doc Updater backend running on http://localhost:${PORT}`);
  console.log(`   Groq key:      ${process.env.GROQ_API_KEY ? '✓ configured' : '✗ missing'}`);
  console.log(`   GitHub token:  ${process.env.GITHUB_TOKEN ? '✓ configured' : '○ optional (public repos only)'}\n`);
});
