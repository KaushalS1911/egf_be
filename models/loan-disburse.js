const mongoose = require("mongoose")

const disburseLoanSchema = new mongoose.Schema({
    company: {type: String, ref: "Company", required: true},
    loan: {type: String, ref: "Issued Loan", required: true},
})