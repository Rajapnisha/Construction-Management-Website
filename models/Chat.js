const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['project', 'direct'],
        default: 'project'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: { type: String, required: false }, // Made optional for image-only messages
    image: { type: String }, // Path to uploaded image
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
