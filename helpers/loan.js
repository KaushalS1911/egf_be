const IssuedLoanModel = require('../models/issued-loan');

async function generateNextLoanNumber(series, company, branch) {
    try {
        const [prefix] = series.split("_").slice(0, 3).join("_"); // Extract prefix (EGF_YGL/24_25)

        // Fetch loans associated with the company
        const loans = await IssuedLoanModel.find({ deleted_at: null, company }).select("customer").populate({
            path: "customer",
        });

        console.log("---------------------------loans", loans)

        // Filter loans by branch
        const filteredLoans = loans && loans.length !== 0 && loans.filter(loan => loan.customer?.branch === branch);
        console.log("filteredLoans.length", filteredLoans?.length)
        // Determine the next loan number
        const nextNumber = (filteredLoans?.length + 1).toString().padStart(4, "0");

        console.log("prefix", prefix)
        return `${prefix}/${nextNumber}`;
    } catch (error) {
        console.error("Error generating loan number:", error);
        throw new Error("Failed to generate loan number");
    }
}



module.exports = {generateNextLoanNumber}