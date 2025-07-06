import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';


const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const generateToken = (userId) => {
    return jwt.sign({ userId }, 
    process.env.JWT_SECRET,{expiresIn: '30d'},)
}

router.post('/register', async (req, res) => {
  // Handle login logic here
//   res.send({ message: 'Registration successful' });
try {
    const { email,username, password,className } = req.body;

    if(!email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if(password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if(username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    // check if user already exists

    const existingUser = await User.findOne({ $or:[{email},{username}]})
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists please login' });
    }

    const user = new User({
        email,
        username,
        password,
        class: className, // Assuming 'class' is a required field
        profileImage: `https://api.dicebear.com/5.x/initials/svg?seed=${username}`,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
        token,
        user: {
            _id: user._id,
            email: user.email,
            username: user.username,
            profileImage: user.profileImage,
        },
    })
} catch (error) {
    console.log("Error in register route",error);
    res.status(500).json({ error: 'Internal server error' });
}
});

router.post('/login', async (req, res) => {
  // Handle login logic here
    try {
        const { email, password } = req.body;
    
        if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
        }
    
        const user = await User.findOne({ email });
    
        if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
        }
    
        const isMatch = await user.comparePassword(password);
    
        if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
        }
    
        const token = generateToken(user._id);
    
        res.json({
        token,
        user: {
            _id: user._id,
            email: user.email,
            username: user.username,
            profileImage: user.profileImage,
        },
        });
    } catch (error) {
        console.log("Error in login route", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Generate a fallback username from the name
      const usernameBase = name?.replace(/\s/g, '').toLowerCase() || 'user';
      const username = `${usernameBase}_${Math.floor(Math.random() * 1000)}`;

      user = await User.create({
        username,
        email,
        password: Math.random().toString(36).slice(-8), // Dummy password
        class: 'N/A',
        profileImage: picture,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ error: 'Invalid Google Token' });
  }
});



export default router;