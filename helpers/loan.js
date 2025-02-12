const IssuedLoanModel = require('../models/issued-loan');

async function generateNextLoanNumber(series, company) {
    let parts = series.split("_"); // Split by underscore
    let prefix = `${parts[0]}_${parts[1]}`; // Extract prefix (EGF_YGL/24_25)

    // Get the count of existing loans for the company
    const loanCount = await IssuedLoanModel.countDocuments({ deleted_at: null, company });

    // Next number should be loanCount + 1
    let nextNumber = loanCount + 1;

    // Ensure the number is formatted as 4-digit (or 6-digit if needed)
    let formattedNumber = nextNumber.toString().padStart(4, "0");

    return `${prefix}_${formattedNumber}`;
}



module.exports = {generateNextLoanNumber}