const mongoose = require("mongoose")

const reminderSchema = new mongoose.Schema({
    company: {type: String, ref: "Company"},
    loan: {type: String, ref: "Issued loan", required: true},
    nextReminderDate: Date,
    remark: String,
    deleted_at: {type: Date, default: null}
}, {timestamps: true})

module.exports = mongoose.model('Reminder', reminderSchema)





