const Chat = require('./models/Chat');
const Project = require('./models/Project');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

module.exports = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) return next(new Error('User not found'));

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.name}`);

        // Join Project Room (Group Chat)
        socket.on('joinProject', async (projectId) => {
            try {
                // Check if user is part of the project
                const project = await Project.findById(projectId);
                if (!project) return socket.emit('error', 'Project not found');

                const isAllowed =
                    project.engineer.equals(socket.user._id) ||
                    project.client.equals(socket.user._id) ||
                    project.employees.includes(socket.user._id);

                if (isAllowed) {
                    socket.join(projectId);
                    console.log(`${socket.user.name} joined project room: ${projectId}`);
                } else {
                    socket.emit('error', 'Not authorized to join this project chat');
                }
            } catch (err) {
                console.error('Error in joinProject:', err);
                socket.emit('error', 'Failed to join project chat');
            }
        });

        // Join User Room (Direct Chat)
        socket.on('joinUser', () => {
            socket.join(socket.user._id.toString());
            console.log(`User ${socket.user.name} joined personal room: ${socket.user._id}`);
        });

        // Handle Group Message
        socket.on('sendMessage', async ({ projectId, message }) => {
            if (!socket.rooms.has(projectId)) {
                return socket.emit('error', 'You must join the project room first');
            }

            try {
                const chatMessage = await Chat.create({
                    type: 'project',
                    project: projectId,
                    sender: socket.user._id,
                    message
                });

                const populatedMessage = await chatMessage.populate('sender', 'name role employeeType profileImage');

                io.to(projectId).emit('receiveMessage', populatedMessage);
            } catch (err) {
                console.error('Message error:', err);
                socket.emit('error', 'Failed to send message');
            }
        });

        // Handle Direct Message
        socket.on('sendDirectMessage', async (data) => {
            try {
                const { recipientId, message } = data;

                const newChat = await Chat.create({
                    type: 'direct',
                    sender: socket.user._id,
                    recipient: recipientId,
                    message
                });

                const populatedChat = await newChat.populate('sender', 'name role employeeType profileImage');

                // Emit to recipient's room
                io.to(recipientId).emit('receiveDirectMessage', populatedChat);
                // Emit back to sender
                socket.emit('receiveDirectMessage', populatedChat);

            } catch (err) {
                console.error('Direct Message error:', err);
                socket.emit('error', 'Failed to send direct message');
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.name}`);
        });
    });
};
