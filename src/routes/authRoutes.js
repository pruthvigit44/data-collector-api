import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

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



export default router;