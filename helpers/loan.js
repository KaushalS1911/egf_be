const IssuedLoanModel = require('../models/issued-loan');

async function generateNextLoanNumber(series, company, branch) {
    try {
        const [prefix] = series.split("_").slice(0, 3).join("_"); // Extract prefix (EGF_YGL/24_25)

        // Fetch loans associated with the company
        const loans = await IssuedLoanModel.find({ deleted_at: null, company }).populate({
            path: "customer",
            populate: { path: "branch" }
        });

        // Filter loans by branch
        const filteredLoans = loans.filter(loan => loan.customer?.branch?._id?.toString() === branch);

        // Determine the next loan number
        const nextNumber = (filteredLoans.length + 1).toString().padStart(4, "0");

        console.log(prefix)
        return `${prefix}/${nextNumber}`;
    } catch (error) {
        console.error("Error generating loan number:", error);
        throw new Error("Failed to generate loan number");
    }
}



module.exports = {generateNextLoanNumber}