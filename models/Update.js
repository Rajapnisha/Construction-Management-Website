const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: { type: String, required: true },
    image: { type: String },
    video: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Update', updateSchema);
