const mongoose = require('mongoose')

const paymentDetailsSchema = new mongoose.Schema({
    from: mongoose.Schema.Types.Mixed,
    to: mongoose.Schema.Types.Mixed,
    amount: Number,
    adjustmentType: {type: String},
}, {_id: false});

const transferSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    transferType: {type: String, required: true},
    transferDate: {type: Date, default: Date.now},
    desc: {type: String,},
    paymentDetails: {type: paymentDetailsSchema, required: true,},
    deleted_at: {type: Date, default: null},
}, {
    timestamps: true,
});

module.exports = mongoose.model("Transfer", transferSchema);
