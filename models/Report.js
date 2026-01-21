const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
