import express from 'express';
import Data from '../models/Data.js';

const router = express.Router();

// Get list of all students
router.get('/', async (req, res) => {
  try {
    const data = await Data.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


//get individual student by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await Data.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Student not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Add a new student
router.post('/', async (req, res) => {
  const newData = new Data(req.body);

  try {
    const savedData = await newData.save();
    res.status(201).json(savedData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a student's data
router.put('/:id', async (req, res) => {
  try {
    const updatedData = await Data.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedData) return res.status(404).json({ message: "Student not found" });
    res.json(updatedData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

import mongoose from 'mongoose';

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }

  try {
    const deletedData = await Data.findByIdAndDelete(id);
    if (!deletedData)
      return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;