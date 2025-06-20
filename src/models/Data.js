import mongoose  from "mongoose";

const dataSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    parentName: { type: String, required: true },
    parentContact: { type: String, required: true },
    email: { type: String },
    class: { type: String, required: true },
    section: { type: String },
    admissionDate: { type: Date, default: Date.now },
    attendance: [{
        date: Date,
        status: { type: String, enum: ['Present', 'Absent', 'Leave'] }
    }],
    grades: [{
        subject: String,
        score: Number,
        maxScore: Number
    }],
    remarks: { type: String }
});

const Data = mongoose.model("Student", dataSchema);

export default Data;