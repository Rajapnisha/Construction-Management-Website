const Report = require('../models/Report');

// Get All Reports
exports.getAllReports = async (req, res) => {
    try {
        const reports = await Report.find().populate('createdBy', 'name email role').populate('project', 'projectName');
        res.status(200).json({ status: 'success', results: reports.length, data: { reports } });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// Create Report
exports.createReport = async (req, res) => {
    try {
        const { title, description, project, status } = req.body;
        const report = await Report.create({
            title,
            description,
            project,
            status,
            createdBy: req.user._id
        });
        res.status(201).json({ status: 'success', data: { report } });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// Update Report
exports.updateReport = async (req, res) => {
    try {
        const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.status(200).json({ status: 'success', data: { report } });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};

// Delete Report
exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findByIdAndDelete(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
};
