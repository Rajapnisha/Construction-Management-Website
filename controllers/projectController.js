const Project = require('../models/Project');
const User = require('../models/User');
const Update = require('../models/Update');

// Engineer: Create Project
exports.createProject = async (req, res) => {
    try {
        const { projectName, amount, location, client } = req.body;

        // Check if project files exist (multer)
        // If files are uploaded, use their path. Otherwise check if a URL string was provided in the body.
        const projectImage = req.files && req.files['projectImage'] ? req.files['projectImage'][0].path : req.body.projectImage;
        const blueprint = req.files && req.files['blueprint'] ? req.files['blueprint'][0].path : req.body.blueprint;

        const project = await Project.create({
            projectName,
            amount,
            location,
            projectImage,
            blueprint,
            engineer: req.user._id,
            client
        });

        res.status(201).json({ status: 'success', data: { project } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Engineer: Assign Employees to Project
exports.assignEmployees = async (req, res) => {
    try {
        const { employees } = req.body; // Array of employee IDs
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { employees: { $each: employees } } },
            { new: true }
        );

        // Update employees' assignedProjects
        await User.updateMany(
            { _id: { $in: employees } },
            { $addToSet: { assignedProjects: project._id } }
        );

        res.status(200).json({ status: 'success', data: { project } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Engineer & Employee: Post Daily Update
exports.postUpdate = async (req, res) => {
    try {
        const { message } = req.body;
        const projectId = req.params.id;

        // Check if user is part of the project
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isSelfEngineer = project.engineer.equals(req.user._id);
        const isAssignedEmployee = project.employees.includes(req.user._id);

        if (!isSelfEngineer && !isAssignedEmployee) {
            return res.status(403).json({ message: 'Not authorized to post updates to this project' });
        }

        const image = req.files && req.files['image'] ? req.files['image'][0].path : undefined;
        const video = req.files && req.files['video'] ? req.files['video'][0].path : undefined;

        const update = await Update.create({
            project: projectId,
            postedBy: req.user._id,
            message,
            image,
            video
        });

        res.status(201).json({ status: 'success', data: { update } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// All Project Members: Get Updates
exports.getProjectUpdates = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId);

        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isAllowed =
            project.engineer.equals(req.user._id) ||
            project.client.equals(req.user._id) ||
            project.employees.includes(req.user._id);

        if (!isAllowed) {
            return res.status(403).json({ message: 'Not authorized to view updates for this project' });
        }

        const updates = await Update.find({ project: projectId }).populate('postedBy', 'name role employeeType').sort('-createdAt');
        res.status(200).json({ status: 'success', results: updates.length, data: { updates } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};
// Get All Projects (relevant to the user's role)
exports.getAllProjects = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'client') filter = { client: req.user._id };
        if (req.user.role === 'employee') filter = { employees: req.user._id };
        if (req.user.role === 'engineer') filter = { engineer: req.user._id };

        const projects = await Project.find(filter).populate('client engineer', 'name email');
        res.status(200).json({ status: 'success', results: projects.length, data: { projects } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Get Single Project
exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('engineer', 'name email phoneNumber address city state zipCode profileImage')
            .populate('client', 'name email phoneNumber address city state zipCode profileImage')
            .populate('employees', 'name role employeeType email phoneNumber address city state zipCode profileImage');

        if (!project) return res.status(404).json({ message: 'Project not found' });

        res.status(200).json({ status: 'success', data: { project } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};
// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        let projectFilter = {};
        if (req.user.role === 'engineer') projectFilter = { engineer: req.user._id };
        if (req.user.role === 'client') projectFilter = { client: req.user._id };
        if (req.user.role === 'employee') projectFilter = { employees: req.user._id };

        const activeProjects = await Project.countDocuments(projectFilter);

        // Get Clients Count (Only for Engineer)
        let clientsCount = 0;
        if (req.user.role === 'engineer') {
            // Count unique clients across all projects owned by this engineer
            // Or better, simply count all Users with role='client' (assuming simplified model where engineer sees all clients)
            clientsCount = await User.countDocuments({ role: 'client' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                activeProjects,
                clientsCount
            }
        });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

// Get Public Projects (For Home Screen)
exports.getPublicProjects = async (req, res) => {
    try {
        const projects = await Project.find()
            .select('projectName projectImage location amount')
            .sort('-createdAt')
            .limit(5);

        res.status(200).json({ status: 'success', results: projects.length, data: { projects } });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};
