const IssuedLoanModel = require('../models/issued-loan');
const EmployeeModel = require("../models/employee");
const BranchModel = require("../models/branch");

async function generateNextLoanNumber(series, company, branch) {
    let parts = series.split("_"); // Split by underscore
    let prefix = `${parts[0]}_${parts[1]}_${parts[2]}`; // Extract prefix (EGF_YGL/24_25)

    // Get the count of existing loans for the company
    const loans = await IssuedLoanModel.find({deleted_at: null, company}).populate("customer");

    const updatedLoans = await Promise.all(loans.map(async (loan) => {
        loan.customer.branch = await BranchModel.findById(loan.customer.branch);
    }))

    const filteredLoans = updatedLoans.filter(loan => loan.customer && loan.customer.branch?._id?.toString() === branch)

    const loanCount = filteredLoans.length

// Next number should be loanCount + 1
    let nextNumber = loanCount + 1;

// Ensure the number is formatted as 4-digit (or 6-digit if needed)
    let formattedNumber = nextNumber.toString().padStart(4, "0");

    return `${prefix}/${formattedNumber}`;
}


module.exports = {generateNextLoanNumber}