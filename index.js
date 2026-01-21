const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes'); // Import report routes

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes); // Use report routes

app.get('/', (req, res) => {
    res.send("API is running...");
});

// Socket.IO
require('./socket')(io);

// DB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sivakumarsiva@cluster0.ufpyq.mongodb.net/construction_mgnt';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.log(err));
