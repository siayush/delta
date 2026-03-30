import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import requestRoutes from './routes/requests';
import folderRoutes from './routes/folders';
import snapshotRoutes from './routes/snapshots';
import environmentRoutes from './routes/environments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/delta';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/requests', requestRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/environments', environmentRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
