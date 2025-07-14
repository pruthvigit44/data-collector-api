import mongoose from "mongoose";

const dataSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    contact: { type: String, required: true },
    email: { type: String },
    class: { type: String, required: true },
    section: { type: String },
    createdDate: { type: Date, default: Date.now },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String },    
});

const Data = mongoose.model("Student", dataSchema);

export default Data;