"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const google_auth_library_1 = require("google-auth-library");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client();
// Zod verification schemas (Schema Validation Rule)
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const googleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1, 'Google ID Token is required'),
});
// Helper: Generate JWT token
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is missing from environment variables.');
    }
    return jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn: '7d' });
};
// 1. POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const parseResult = registerSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.issues[0].message });
            return;
        }
        const { name, email, password } = parseResult.data;
        // Check if user already exists
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists.' });
            return;
        }
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create user
        const newUser = await User_1.User.create({
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
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 2. POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const parseResult = loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.issues[0].message });
            return;
        }
        const { email, password } = parseResult.data;
        // Find user
        const user = await User_1.User.findOne({ email });
        if (!user || !user.password) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
        }
        // Check password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
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
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// 3. POST /api/auth/google
router.post('/google', async (req, res, next) => {
    try {
        const parseResult = googleAuthSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.issues[0].message });
            return;
        }
        const { idToken } = parseResult.data;
        let email;
        let name;
        let googleId;
        let avatar;
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
            }
            catch (err) {
                console.error('Google Auth library verification failed, trying fallback API endpoint...', err);
            }
        }
        // Fallback: Verify token using Google's public endpoint if client verification is bypassed/fails
        if (!email) {
            try {
                const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
                if (response.ok) {
                    const payload = (await response.json());
                    email = payload.email;
                    name = payload.name || payload.given_name;
                    googleId = payload.sub;
                    avatar = payload.picture;
                }
            }
            catch (err) {
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
        let user = await User_1.User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            user = await User_1.User.create({
                name: name || email.split('@')[0],
                email,
                googleId,
                avatar,
            });
        }
        else if (!user.googleId) {
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
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
