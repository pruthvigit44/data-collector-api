import mongoose from 'mongoose';
import express from 'express';
import Data from '../models/Data.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateRegistrationNumber = async () => {
  const result = await Data.aggregate([
    {
      $addFields: {
        numericReg: { $toInt: "$registrationNumber" },
      },
    },
    { $sort: { numericReg: -1 } },
    { $limit: 1 },
  ]);

  const lastNumber = result[0]?.numericReg || 0;
  const nextNumber = lastNumber + 1;
  return nextNumber.toString().padStart(3, '0');  // → "001", "002"
};



// Get list of all students
router.get('/', protect, async (req, res) => {
  console.log("Fetching for userId:", req.user.userId); // ⬅️ log this

  try {
    const students = await Data.find({ createdBy: req.user.userId });

    console.log("Students fetched:", students); // ⬅️ log this

    res.status(200).json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: err.message });
  }
});



//get individual student by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const data = await Data.findById(req.params.id);
//     if (!data) return res.status(404).json({ message: "Student not found" });
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// New (with `protect` middleware and ownership check)
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Data.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    }).populate('createdBy');

    if (!student) {
      return res.status(404).json({ message: 'Student not found or unauthorized' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// router.post('/', protect, async (req, res) => {
//   try {
//     console.log("Received request body:", req.body);
//     if (!req.user || !req.user.userId) {
//       console.error("User not authenticated, req.user:", req.user);
//       return res.status(401).json({ message: "User not authenticated" });
//     }
//     const newStudent = new Data({
//       ...req.body,
//       createdBy: req.user.userId, // Store user ID
//     });
//     console.log("New student before save:", newStudent.toObject());
//     const savedStudent = await newStudent.save({ runValidators: true });
//     console.log("Saved student after save:", savedStudent.toObject());
//     res.status(201).json(savedStudent);
//   } catch (error) {
//     console.error("Error creating student:", error.message, error.stack);
//     res.status(400).json({ message: error.message, stack: error.stack });
//   }
// });

router.post('/', protect, async (req, res) => {
  try {
    const registrationNumber = await generateRegistrationNumber();

    const newStudent = new Data({
      ...req.body,
      // registrationNumber, // auto set
      createdBy: req.user.userId,
    });

    const savedStudent = await newStudent.save({ runValidators: true });
    res.status(201).json(savedStudent);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(400).json({ message: error.message });
  }
});

// New (with protect + ownership check)
router.put('/:id', protect, async (req, res) => {
  try {
    const updatedStudent = await Data.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found or unauthorized' });
    }

    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// router.delete('/:id', async (req, res) => {
//   const { id } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({ message: "Invalid student ID format" });
//   }

//   try {
//     const deletedData = await Data.findByIdAndDelete(id);
//     if (!deletedData)
//       return res.status(404).json({ message: "Student not found" });

//     res.json({ message: "Student deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// New (with protect + ownership check)
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid student ID format' });
  }

  try {
    const deletedData = await Data.findOneAndDelete({
      _id: id,
      createdBy: req.user.userId,
    });

    if (!deletedData) {
      return res.status(404).json({ message: 'Student not found or unauthorized' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


export default router;