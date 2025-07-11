import mongoose  from "mongoose";

const dataSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
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
    parentName: { type: String, required: true },
    parentContact: { type: String, required: true },
    email: { type: String },
    class: { type: String, required: true },
    section: { type: String },
    admissionDate: { type: Date, default: Date.now },
    remarks: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the user who created the record

});

const Data = mongoose.model("Student", dataSchema);

export default Data;