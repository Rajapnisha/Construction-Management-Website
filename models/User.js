const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['engineer', 'employee', 'client'],
        required: true
    },
    // Only for employees
    employeeType: {
        type: String,
        enum: ['Plumber', 'Electrician', 'Builder', 'Painter', 'Carpenter', 'Supervisor', 'Helper'],
        required: function () { return this.role === 'employee'; }
    },
    // assignedProjects for employees and clients
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    profileImage: { type: String },
    phoneNumber: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
