const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    return client.db('premium-learning');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// ===== ROUTES =====
app.post('/admin-login', (req, res) => {
  const { password } = req.body;
  res.json({ success: password === (process.env.ADMIN_PASSWORD || 'admin123') });
});

// Get all data
app.get('/data', async (req, res) => {
  try {
    const db = await connectDB();
    
    const categories = await db.collection('categories').find().toArray();
    const pdfs = await db.collection('pdfs').find().toArray();
    const joinVip = await db.collection('vip').findOne({}) || {};
    
    res.json({ categories, pdfs, joinVip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Category routes
app.post('/category', async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection('categories').insertOne({
      id: Date.now(),
      name: req.body.name,
      albums: []
    });
    res.json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Album routes
app.post('/album', async (req, res) => {
  try {
    const db = await connectDB();
    const { catId, name } = req.body;
    
    await db.collection('categories').updateOne(
      { id: Number(catId) },
      { $push: { albums: { id: Date.now(), name, videos: [] } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Video routes
app.post('/video', async (req, res) => {
  try {
    const db = await connectDB();
    const { albumId, title, link } = req.body;
    
    await db.collection('categories').updateOne(
      { 'albums.id': Number(albumId) },
      { $push: { 'albums.$.videos': { id: Date.now(), title, link } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF routes
app.post('/pdf', async (req, res) => {
  try {
    const db = await connectDB();
    await db.collection('pdfs').insertOne({
      id: Date.now(),
      title: req.body.title,
      link: req.body.link
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VIP routes
app.put('/joinvip', async (req, res) => {
  try {
    const db = await connectDB();
    await db.collection('vip').updateOne(
      {},
      { $set: req.body },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete routes (contoh)
app.delete('/category/:id', async (req, res) => {
  try {
    const db = await connectDB();
    await db.collection('categories').deleteOne({ id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;