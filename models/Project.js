const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    amount: { type: Number, required: true },
    location: { type: String, required: true },
    projectImage: { type: String }, // URL or path
    blueprint: { type: String },    // URL or path
    engineer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
