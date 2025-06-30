import express from 'express';
import cors from 'cors';
import job from './lib/cron.js';
import "dotenv/config";
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from './routes/authRoutes.js';
import { connectDB } from './lib/db.js';
import data from './routes/data.js';
import { protect } from './middleware/auth.js';


const app = express();
const PORT = process.env.PORT || 3000;

job.start(); // Start the cron job
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Enable CORS for all routes
// console.log( { PORT });

app.use("/api/auth",authRoutes);
app.use("/api/data", protect,data);

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
  connectDB();
});