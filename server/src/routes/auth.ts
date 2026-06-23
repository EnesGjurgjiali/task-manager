import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';

const router = Router();
const googleClient = new OAuth2Client();

// Zod verification schemas (Schema Validation Rule)
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID Token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

interface GoogleTokenInfo {
  email?: string;
  name?: string;
  given_name?: string;
  sub?: string;
  picture?: string;
}

// Helper: Generate JWT token
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing from environment variables.');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

// 1. POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { name, email, password } = parseResult.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(newUser.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { email, password } = parseResult.data;

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user.id);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/auth/google
router.post('/google', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { idToken } = parseResult.data;
    let email: string | undefined;
    let name: string | undefined;
    let googleId: string | undefined;
    let avatar: string | undefined;

    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Standard google token verification
    if (clientId) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email;
          name = payload.name;
          googleId = payload.sub;
          avatar = payload.picture;
        }
      } catch (err) {
        console.error('Google Auth library verification failed, trying fallback API endpoint...', err);
      }
    }

    // Fallback: Verify token using Google's public endpoint if client verification is bypassed/fails
    if (!email) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.ok) {
          const payload = (await response.json()) as GoogleTokenInfo;
          email = payload.email;
          name = payload.name || payload.given_name;
          googleId = payload.sub;
          avatar = payload.picture;
        }
      } catch (err) {
        console.error('Fallback endpoint verification failed:', err);
      }
    }

    // If both failed, check if this is a development bypass ID token (for local testing purposes only)
    if (!email && process.env.NODE_ENV !== 'production' && idToken.startsWith('dev-token-')) {
      const parts = idToken.split('-');
      email = parts[2] || 'dev@example.com';
      name = parts[3] || 'Developer User';
      googleId = parts[2] || 'dev-id';
      avatar = undefined;
    }

    if (!email || !googleId) {
      res.status(401).json({ error: 'Failed to verify Google ID token.' });
      return;
    }

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar,
      });
    } else if (!user.googleId) {
      // Link Google ID if user registered with email first
      user.googleId = googleId;
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    const token = generateToken(user.id);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/auth/change-password
import { authenticateToken, AuthRequest } from '../middleware/auth';

router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!user.password) {
      res.status(400).json({ error: 'This account uses a third-party login.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
