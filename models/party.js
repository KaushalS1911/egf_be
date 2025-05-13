const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
    company: {type: String, ref: 'Company'},
    branch: {type: String, ref: 'Branch'},
    name: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
