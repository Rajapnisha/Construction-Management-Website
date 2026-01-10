const Chat = require('../models/Chat');
const Project = require('../models/Project');

// Get Chat History (Project or Direct)
exports.getChatHistory = async (req, res) => {
    try {
        const { type } = req.query; // 'project' or 'direct'
        const targetId = req.params.projectId; // This can be projectId OR otherUserId
        let messages = [];

        if (type === 'direct') {
            // Fetch messages between logged-in user and target user
            messages = await Chat.find({
                type: 'direct',
                $or: [
                    { sender: req.user._id, recipient: targetId },
                    { sender: targetId, recipient: req.user._id }
                ]
            })
                .populate('sender', 'name role employeeType profileImage')
                .populate('recipient', 'name role employeeType profileImage')
                .sort('createdAt');
        } else {
            // Default: Project Chat
            // Check if user is part of the project
            // Note: If projectId is not a valid ObjectId, findById might fail. 
            // Ideally we check type first.
            const project = await Project.findById(targetId);
            if (!project) return res.status(404).json({ message: 'Project not found' });

            const isAllowed =
                req.user.role === 'admin' ||
                project.engineer.equals(req.user._id) ||
                project.client.equals(req.user._id) ||
                project.employees.includes(req.user._id);

            if (!isAllowed) {
                return res.status(403).json({ message: 'Not authorized to view this chat' });
            }

            messages = await Chat.find({ project: targetId })
                .populate('sender', 'name role employeeType profileImage')
                .sort('createdAt');
        }

        res.status(200).json({ status: 'success', results: messages.length, data: { history: messages } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Send Image Message (HTTP Upload -> Socket Emit)
exports.sendImageMessage = async (req, res) => {
    try {
        const { projectId, recipientId, message } = req.body;
        const image = req.file ? req.file.path : null;

        if (!image) return res.status(400).json({ message: 'No image uploaded' });

        let chatData = {
            sender: req.user._id,
            message: message || '',
            image
        };

        if (projectId) {
            chatData.type = 'project';
            chatData.project = projectId;
        } else if (recipientId) {
            chatData.type = 'direct';
            chatData.recipient = recipientId;
        } else {
            return res.status(400).json({ message: 'Target (projectId or recipientId) required' });
        }

        const chat = await Chat.create(chatData);
        // Populate sender info for frontend
        const populatedChat = await chat.populate('sender', 'name role employeeType profileImage');

        const io = req.app.get('io');
        if (projectId) {
            io.to(projectId).emit('receiveMessage', populatedChat);
        } else {
            io.to(recipientId).emit('receiveDirectMessage', populatedChat);
        }

        res.status(201).json({ status: 'success', data: { chat: populatedChat } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Delete Single Message (Only Sender)
exports.deleteMessage = async (req, res) => {
    try {
        const message = await Chat.findById(req.params.id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        // Check ownership
        if (!message.sender.equals(req.user._id)) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }

        // WhatsApp Style: Soft Delete
        message.isDeleted = true;
        message.message = 'This message was deleted';
        message.image = null; // Remove image reference
        await message.save();

        // Notify clients to update message
        const io = req.app.get('io');

        // Populate sender to return consistent structure (optional but helpful)
        await message.populate('sender', 'name role employeeType profileImage');

        if (message.type === 'project') {
            io.to(message.project.toString()).emit('messageUpdated', message);
        } else if (message.type === 'direct') {
            // Emit to both
            io.to(message.recipient.toString()).emit('messageUpdated', message);
            io.to(message.sender._id.toString()).emit('messageUpdated', message);
        }

        res.status(200).json({ status: 'success', message: 'Message deleted' });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Clear Project Chat History (Admin & Engineer Only)
exports.clearProjectChat = async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = await Project.findById(projectId);

        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Auth Check: Admin or Project Engineer
        const isAuthorized = req.user.role === 'admin' || project.engineer.equals(req.user._id);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Only Admin or Project Engineer can clear chat' });
        }

        // Delete all messages for this project
        await Chat.deleteMany({ project: projectId, type: 'project' });

        // Notify clients
        const io = req.app.get('io');
        io.to(projectId).emit('chatCleared');

        res.status(200).json({ status: 'success', message: 'Chat history cleared' });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};
