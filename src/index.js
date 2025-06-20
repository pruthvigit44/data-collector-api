import express from 'express';
import "dotenv/config";
import authRoutes from './routes/authRoutes.js';
import { connectDB } from './lib/db.js';
import data from './routes/data.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON bodies
// console.log( { PORT });

app.use("/api/auth",authRoutes);
app.use("/api/data", data);

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
  connectDB();
});