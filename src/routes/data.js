import mongoose from "mongoose";
import express from "express";
import Data from "../models/Data.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";

const router = express.Router();

// ✅ FIX: Absolute safe path
const uploadsDir = path.join(process.cwd(), "uploads");

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const tempName = `temp_${Date.now()}${ext}`;
    cb(null, tempName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG and PNG images are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("image");

const generateRegistrationNumber = async () => {
  try {
    const lastStudent = await Data.findOne({
      registrationNumber: { $regex: /^S\d+$/ },
    })
      .sort({ registrationNumber: -1 })
      .select("registrationNumber");

    let lastNumber = 0;
    if (lastStudent && lastStudent.registrationNumber) {
      const match = lastStudent.registrationNumber.match(/^S(\d+)$/);
      if (match) {
        lastNumber = parseInt(match[1], 10);
      }
    }
    const nextNumber = lastNumber + 1;
    return `S${nextNumber.toString().padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating registration number:", error);
    throw new Error("Could not generate registration number");
  }
};

// 🟢 GET all students
router.get("/", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(401).json({ message: "Invalid user ID" });
    }
    const students = await Data.find({ createdBy: req.user.userId });
    res.status(200).json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🟢 GET student by ID
router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID format" });
    }
    const student = await Data.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found or unauthorized" });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🟢 POST: Create new student
router.post("/", protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
        return res.status(401).json({ message: "Invalid user ID" });
      }

      const registrationNumber = await generateRegistrationNumber();
      const { firstName } = req.body;

      let imagePath;
      if (req.file) {
        const ext = path.extname(req.file.originalname);
        const newFilename = `${registrationNumber}_${firstName}${ext}`;
        const newPath = path.join(uploadsDir, newFilename);
        fs.renameSync(req.file.path, newPath);
        imagePath = `/uploads/${newFilename}`;
      }

      const newStudent = new Data({
        ...req.body,
        registrationNumber,
        createdBy: req.user.userId,
        image: imagePath,
      });

      const savedStudent = await newStudent.save({ runValidators: true });
      res.status(201).json(savedStudent);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).json({ message: error.message });
    }
  });
});

// 🟢 PUT: Update student
router.put("/:id", protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(req.user.userId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const student = await Data.findById(id);
      if (!student || String(student.createdBy) !== req.user.userId) {
        return res.status(404).json({ message: "Student not found or unauthorized" });
      }

      let imagePath = req.body.image;
      if (req.file) {
        const ext = path.extname(req.file.originalname);
        const newFilename = `${student.registrationNumber}_${req.body.firstName || student.firstName}${ext}`;
        const newPath = path.join(uploadsDir, newFilename);
        fs.renameSync(req.file.path, newPath);
        imagePath = `/uploads/${newFilename}`;

        // Delete old image
        if (student.image) {
          const oldPath = path.join(process.cwd(), student.image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      const updatedStudent = await Data.findOneAndUpdate(
        { _id: id, createdBy: req.user.userId },
        { ...req.body, image: imagePath },
        { new: true, runValidators: true }
      );

      res.json(updatedStudent);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(400).json({ message: error.message });
    }
  });
});

// 🟢 DELETE student
router.delete("/:id", protect, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid student ID format" });
  }
  try {
    const deletedData = await Data.findOneAndDelete({
      _id: id,
      createdBy: req.user.userId,
    });

    if (!deletedData) {
      return res.status(404).json({ message: "Student not found or unauthorized" });
    }

    // Delete associated image
    if (deletedData.image) {
      const imagePath = path.join(process.cwd(), deletedData.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: error.message });
  }
});

// 🟢 DOWNLOAD all student images as ZIP
router.get("/download-images", protect, async (req, res) => {
  try {
    const students = await Data.find({ createdBy: req.user.userId }).select("image registrationNumber firstName");

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=student-images.zip");
    archive.pipe(res);

    for (const student of students) {
      if (student.image) {
        const imagePath = path.join(uploadsDir, path.basename(student.image)); // ✅ fix: ensure correct image path
        if (fs.existsSync(imagePath)) {
          const filename = `${student.registrationNumber}_${student.firstName}${path.extname(imagePath)}`;
          archive.file(imagePath, { name: filename });
        } else {
          console.warn("Missing image for student:", student._id, imagePath);
        }
      }
    }

    archive.finalize();
  } catch (error) {
    console.error("ZIP creation error:", error);
    res.status(500).json({ message: "Failed to create ZIP file" });
  }
});

export default router;
