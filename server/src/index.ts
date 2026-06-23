import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Fatal Error: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized error handling middleware (Secure Error Handling Rule)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err.message, err.stack);
  res.status(500).json({
    error: 'An internal server error occurred. Please try again later.',
  });
});

// Connect to MongoDB & Start Server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB database successfully.');
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server is running locally on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
