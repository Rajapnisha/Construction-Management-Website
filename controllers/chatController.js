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
