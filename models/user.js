const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    branch: {type: String, ref: "Branch", default: null},
    role: String,
    otp: String,
    avatar_url: {type: String, default: null},
    firstName: String,
    middleName: String,
    lastName: String,
    email: String,
    contact: String,
    password: String,
    other_info: Object,
    deleted_at: {type: Date, default: null},
    attemptToDownload: {type: Array, default: []}
}, {timestamps: true})

module.exports = mongoose.model("User", userSchema)