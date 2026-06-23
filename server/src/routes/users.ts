import express, { Response } from 'express';
import { User } from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users (for inviting to tasks)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Return all users except the currently logged in user
    // Only return name, email, and _id (exclude password and other sensitive fields)
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('name email _id')
      .sort({ name: 1 });
      
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
