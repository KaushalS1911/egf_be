const IssuedLoanModel = require('../models/issued-loan');

async function generateNextLoanNumber(series, company, branch) {
    try {
        // Split the series to extract the prefix
        const parts = series.split("_");
        const prefix = `${parts[0]}_${parts[1]}_${parts[2]}`; // e.g., EGF_YGL/24_25

        // Filter loans directly in the database query
        const branchLoans = await IssuedLoanModel.aggregate([
            {
                $lookup: {
                    from: "customers", // Replace with actual collection name if different
                    localField: "customer",
                    foreignField: "_id",
                    as: "customerData"
                }
            },
            {
                $unwind: "$customerData"
            },
            {
                $lookup: {
                    from: "branches", // Replace with actual collection name if different
                    localField: "customerData.branch",
                    foreignField: "_id",
                    as: "branchData"
                }
            },
            {
                $unwind: "$branchData"
            },
            {
                $match: {
                    "company": company,
                    "deleted_at": null,
                    "branchData._id": branch
                }
            },
            {
                $count: "total"
            }
        ]);

        // Get the count of branch-specific loans
        const loanCount = branchLoans.length > 0 ? branchLoans[0].total : 0;

        // Next number should be loanCount + 1
        const nextNumber = loanCount + 1;

        // Format the number with leading zeros (4 digits)
        const formattedNumber = nextNumber.toString().padStart(4, "0");

        // Return the complete loan number
        return `${prefix}/${formattedNumber}`;
    } catch (error) {
        console.error(`Error generating loan number: ${error.message}`);
        throw new Error("Failed to generate loan number");
    }
}


module.exports = {generateNextLoanNumber}