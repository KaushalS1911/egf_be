const LoanModel = require("../models/loan_type");

async function addLoan(req, res) {
    const { companyId } = req.params;
    const { loanType, remark, approvalCharge } = req.body;

    try {
        const isLoanExist = await LoanModel.exists({
            company: companyId,
            loanType,
            approvalCharge,
            deleted_at: null
        });

        if (isLoanExist) {
            return res.status(400).json({ status: 400, message: "Loan details already exist" });
        }

        const loan = await LoanModel.create({ company: companyId, loanType, remark });

        return res.status(201).json({ status: 201, data: loan, message: "Loan details created successfully" });
    } catch (err) {
        console.error("Error adding loan:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllLoans(req, res) {
    const { companyId } = req.params;

    try {
        const loans = await LoanModel.find({ company: companyId, deleted_at: null }).populate("company");

        return res.status(200).json({ status: 200, data: loans });

    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}


async function updateLoan(req, res) {
    const { loanId } = req.params;

    try {
        const updatedLoan = await LoanModel.findByIdAndUpdate(loanId, req.body, { new: true });

        if (!updatedLoan) {
            return res.status(404).json({ status: 404, message: "Loan not found" });
        }

        return res.status(200).json({ status: 200, data: updatedLoan, message: "Loan type updated successfully" });
    } catch (err) {
        console.error("Error updating loan:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleLoan(req, res) {
    const { loanId } = req.params;

    try {
        const loan = await LoanModel.findById(loanId).populate("company");

        if (!loan) {
            return res.status(404).json({ status: 404, message: "Loan not found" });
        }

        return res.status(200).json({ status: 200, data: loan });
    } catch (err) {
        console.error("Error fetching loan:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleLoans(req, res) {
    const { ids } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "No loan IDs provided" });
        }

        const result = await LoanModel.deleteMany({ _id: { $in: ids } });

        if (result.deletedCount === 0) {
            return res.status(404).json({ status: 404, message: "No loans found for the provided IDs" });
        }

        return res.status(200).json({ status: 200, message: "Loan details deleted successfully" });
    } catch (err) {
        console.error("Error deleting loans:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}


module.exports = { addLoan, getAllLoans, updateLoan, getSingleLoan, deleteMultipleLoans };
