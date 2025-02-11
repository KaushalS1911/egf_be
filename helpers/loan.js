const IssuedLoanModel = require('models/issued-loan')

async function generateNextLoanNumber(series,currentLoanNo, company) {
    let parts = series.split("_"); // Split by underscore
    let numericPart = parseInt(parts[2]); // Extract numeric part
    const loanCount = await IssuedLoanModel.countDocuments({deleted_at: null, company})
    let nextNumber = numericPart + loanCount; // Increment number

    // Format the new loan number to maintain the same length (6 digits)
    let formattedNumber = nextNumber.toString().padStart(6, "0");

    return `${parts[0]}_${parts[1]}_${formattedNumber}`;
}

module.exports = {generateNextLoanNumber}