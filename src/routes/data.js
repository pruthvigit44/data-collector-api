import mongoose from "mongoose";
import express from "express";
import Data from "../models/Data.js";
import { protect } from "../middleware/auth.js";
import multer from "multer";
import { cloudinary, storage } from "../lib/cloudinary.js";
import archiver from "archiver";
import stream from "stream";

const router = express.Router();
const upload = multer({ storage }).single("image");

const generateRegistrationNumber = async () => {
  const lastStudent = await Data.findOne({ registrationNumber: { $regex: /^S\d+$/ } })
    .sort({ registrationNumber: -1 })
    .select("registrationNumber");

  let lastNumber = 0;
  if (lastStudent?.registrationNumber) {
    const match = lastStudent.registrationNumber.match(/^S(\d+)$/);
    if (match) lastNumber = parseInt(match[1], 10);
  }

  return `S${(lastNumber + 1).toString().padStart(3, "0")}`;
};

// GET all students
router.get("/", protect, async (req, res) => {
  try {
    const students = await Data.find({ createdBy: req.user.userId });
    res.status(200).json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DOWNLOAD images as ZIP (Cloudinary URLs are fetched)
router.get("/download-images", protect, async (req, res) => {
  try {
    const students = await Data.find({ createdBy: req.user.userId }).select("image registrationNumber firstName");

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=student-images.zip");
    archive.pipe(res);

    for (const student of students) {
      if (student.image) {
        const response = await fetch(student.image);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const readable = new stream.PassThrough();
        readable.end(Buffer.from(buffer));

        const filename = `${student.registrationNumber}_${student.firstName}.jpg`;
        archive.append(readable, { name: filename });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("ZIP error:", error);
    res.status(500).json({ message: "Failed to create ZIP" });
  }
});

// GET by ID
router.get("/:id", protect, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid student ID" });
  }
  const student = await Data.findOne({ _id: req.params.id, createdBy: req.user.userId });
  if (!student) return res.status(404).json({ message: "Not found or unauthorized" });
  res.json(student);
});

// CREATE student
// router.post("/", protect, (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) return res.status(400).json({ message: err.message });

//     try {
//       const registrationNumber = await generateRegistrationNumber();

//       const { street, city, state, zip, ...rest } = req.body;

//       let imagePath;
//       if (req.file && req.file.path) {
//         imagePath = req.file.path; // Cloudinary URL
//       }

//       const newStudent = new Data({
//         ...rest,
//         registrationNumber,
//         createdBy: req.user.userId,
//         image: imagePath,
//         address: {
//           street,
//           city,
//           state,
//           zip,
//         },
//       });

//       const savedStudent = await newStudent.save({ runValidators: true });
//       res.status(201).json(savedStudent);
//     } catch (error) {
//       console.error("Create error:", error);
//       res.status(400).json({ message: error.message });
//     }
//   });
// });

// UPDATE student
// router.put("/:id", protect, (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) return res.status(400).json({ message: err.message });

//     try {
//       const { id } = req.params;
//       const student = await Data.findById(id);
//       if (!student || String(student.createdBy) !== req.user.userId) {
//         return res.status(404).json({ message: "Not found or unauthorized" });
//       }

//       const { street, city, state, zip, ...rest } = req.body;

//       let imagePath = student.image;
//       if (req.file && req.file.path) {
//         imagePath = req.file.path;

//         // Optional: delete old image from Cloudinary
//         if (student.image) {
//           const publicId = student.image.split('/').pop().split('.')[0];
//           await cloudinary.uploader.destroy(`student-images/${publicId}`);
//         }
//       }

//       const updatedStudent = await Data.findOneAndUpdate(
//         { _id: id, createdBy: req.user.userId },
//         {
//           ...rest,
//           image: imagePath,
//           address: {
//             street,
//             city,
//             state,
//             zip,
//           },
//         },
//         { new: true, runValidators: true }
//       );

//       res.json(updatedStudent);
//     } catch (error) {
//       console.error("Update error:", error);
//       res.status(400).json({ message: error.message });
//     }
//   });
// });


router.post("/", protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err.message, err.stack);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    console.log("Received File:", req.file); // Log the file object
    try {
      const registrationNumber = await generateRegistrationNumber();

      const { street, city, state, zip, ...rest } = req.body;

      let imagePath = req.file ? req.file.path : undefined; // Use req.file.path if available
      if (!imagePath && rest.image) {
        console.warn("No file uploaded, using existing image if any");
        imagePath = rest.image; // Fallback to existing image URL if editing
      }

      const newStudent = new Data({
        ...rest,
        registrationNumber,
        createdBy: req.user.userId,
        image: imagePath,
        address: { street, city, state, zip },
      });

      const savedStudent = await newStudent.save({ runValidators: true });
      res.status(201).json(savedStudent);
    } catch (error) {
      console.error("Create error:", error.message, error.stack);
      res.status(400).json({ message: `Failed to save student: ${error.message}` });
    }
  });
});

router.put("/:id", protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err.message, err.stack);
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    console.log("Received File:", req.file); // Log the file object
    try {
      const { id } = req.params;
      const student = await Data.findById(id);
      if (!student || String(student.createdBy) !== req.user.userId) {
        return res.status(404).json({ message: "Not found or unauthorized" });
      }

      const { street, city, state, zip, ...rest } = req.body;

      let imagePath = student.image; // Default to existing image
      if (req.file && req.file.path) {
        imagePath = req.file.path;
        if (student.image) {
          const publicId = student.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`student-images/${publicId}`);
        }
      }

      const updatedStudent = await Data.findOneAndUpdate(
        { _id: id, createdBy: req.user.userId },
        {
          ...rest,
          image: imagePath,
          address: { street, city, state, zip },
        },
        { new: true, runValidators: true }
      );

      res.json(updatedStudent);
    } catch (error) {
      console.error("Update error:", error.message, error.stack);
      res.status(400).json({ message: `Failed to update student: ${error.message}` });
    }
  });
});

// DELETE student
router.delete("/:id", protect, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  try {
    const student = await Data.findOneAndDelete({ _id: id, createdBy: req.user.userId });

    if (!student) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    if (student.image) {
      const publicId = student.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`student-images/${publicId}`);
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
