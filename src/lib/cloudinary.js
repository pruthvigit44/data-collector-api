const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

require("dotenv").config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Missing Cloudinary environment variables. Check .env file.");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log("Cloudinary Config Loaded:", {
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: "SET", // Avoid logging sensitive data
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    if (!file || !file.originalname) {
      throw new Error("Invalid file object received");
    }
    const extension = file.originalname.split(".").pop().toLowerCase();
    const allowedFormats = ["jpg", "jpeg", "png"];
    if (!allowedFormats.includes(extension)) {
      throw new Error(`Unsupported file format: ${extension}. Use jpg, jpeg, or png.`);
    }
    return {
      folder: "student-images",
      format: extension === "jpg" || extension === "jpeg" ? "jpg" : extension,
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

module.exports = { cloudinary, storage };