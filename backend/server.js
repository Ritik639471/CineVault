require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Watchlist = require('./models/Watchlist');
const Review = require('./models/Review');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vault-cine.netlify.app',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
].filter(Boolean);

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Health check endpoint for Docker / AWS
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CineVault API',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    uptime: Math.floor(process.uptime())
  });
});

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/cinevault';
const JWT_SECRET = process.env.JWT_SECRET || 'cinevault_production_jwt_secret_key_2026';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB error:', err));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/watchlist', authMiddleware, async (req, res) => {
  try {
    const data = await Watchlist.find({ userId: req.user.userId });
    res.json(data);
  } catch (error) {
    console.error('Watchlist GET error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/watchlist', authMiddleware, async (req, res) => {
  try {
    const { movieId, title, poster_path, vote_average } = req.body;

    if (!movieId || !title) {
      return res.status(400).json({ error: 'movieId and title required' });
    }

    const existing = await Watchlist.findOne({
      userId: req.user.userId,
      movieId
    });

    if (existing) {
      return res.status(409).json({ error: 'Movie already in watchlist' });
    }

    const item = new Watchlist({
      userId: req.user.userId,
      movieId,
      title,
      poster_path,
      vote_average
    });

    const saved = await item.save();
    res.status(201).json(saved);

  } catch (error) {
    console.error('Watchlist POST error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/watchlist/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Watchlist.findOneAndDelete({
      userId: req.user.userId,
      movieId: req.params.id
    });

    if (!result) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true });

  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/watchlist/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['plan_to_watch', 'watched'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Watchlist.findOneAndUpdate(
      { userId: req.user.userId, movieId: req.params.id },
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json(updated);

  } catch (error) {
    console.error('Watchlist status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// NEW: GET /api/auth/me — verify session & return current user (useful for page reload)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) {
    console.error('Auth/me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/reviews/:movieId', async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId });
    res.json(reviews);
  } catch (error) {
    console.error('Reviews GET error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
  try {
    const { movieId, rating, reviewText } = req.body;

    if (!movieId || !rating) {
      return res.status(400).json({ error: 'movieId and rating are required' });
    }
    if (rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    const user = await User.findById(req.user.userId);

    const review = await Review.findOneAndUpdate(
      { userId: req.user.userId, movieId },
      { rating, reviewText, userName: user.name },
      { new: true, upsert: true }
    );

    res.json(review);

  } catch (error) {
    console.error('Reviews POST error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const distPath = path.join(__dirname, '../frontend/dist');

if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API running...');
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
