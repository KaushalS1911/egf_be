const IssuedLoanModel = require("../models/issued-loan");
const mongoose = require('mongoose')

async function issueLoan(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {companyId} = req.params
        const {
            customer,
            scheme,
            issueDate,
            nextInstallmentDate,
            jewellerName,
            propertyDetails,
            propertyImage,
            loanAmount,
            paymentMode,
            cashAmount,
            bankAmount,
            bankDetail
        } = req.body;

        const isLoanExist = await IssuedLoanModel.exists({
            company: companyId,
            customer,
            scheme
        });

        if (isLoanExist) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({ status: 400, message: "Loan already exists." });
        }

        const issuedLoan = new IssuedLoanModel({
            company: companyId,
            customer,
            scheme,
            loanNo: generateLoanNumber(companyId),
            transactionNo: generateTransactionNumber(),
            issueDate,
            nextInstallmentDate,
            jewellerName,
            propertyDetails,
            propertyImage,
            loanAmount,
            paymentMode,
            cashAmount,
            bankAmount,
            bankDetail,
        });

        await issuedLoan.save({ session });
        await session.commitTransaction();
        await session.endSession();

        return res.status(201).json({ status: 201, message: "Loan issued successfully", data: issuedLoan });
    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllLoans(req, res) {
    try {
        const {companyId} = req.params
        const loans = await IssuedLoanModel.find({company: companyId})
            .populate("customer")
            .populate("scheme");

        if (!loans || loans.length === 0) {
            return res.status(404).json({ status: 404, message: "No loans found" });
        }

        return res.status(200).json({ status: 200, data: loans });
    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateLoan(req, res) {
    try {
        const { loanId } = req.params;

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, req.body, { new: true });

        if (!updatedLoan) {
            return res.status(404).json({ status: 404, message: "Loan not found." });
        }

        return res.status(200).json({ status: 200, data: updatedLoan, message: "Loan updated successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleLoan(req, res) {
    const { loanId } = req.params;

    try {
        const loan = await IssuedLoanModel.findById(loanId)
            .populate("customer")
            .populate("scheme");

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
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "Invalid loan IDs." });
        }

        await IssuedLoanModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 200, message: "Loans deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 4) {
        return `${currentYear.toString().slice(-2)}_${(currentYear + 1).toString().slice(-2)}`;
    } else {
        return `${(currentYear - 1).toString().slice(-2)}_${currentYear.toString().slice(-2)}`;
    }
};

const generateLoanNumber = async (companyId) => {
    const financialYear = getCurrentFinancialYear();

    const loanCount = await IssuedLoanModel.countDocuments({ company: companyId, loanNo: { $regex: `^EGF/${financialYear}` } });

    const newLoanCount = loanCount + 1;

    const loanNumber = `EGF/${financialYear}_${String(newLoanCount).padStart(6, '0')}`;

    return loanNumber;
};



const generateTransactionNumber = async () => {
    const prefix = 'TRXN';

    let count = 0

    count = await IssuedLoanModel.countDocuments({ company: companyId });

    count += 1;

    const numberPart = String(count).padStart(6, '0');

    const transactionNumber = `${prefix}${numberPart}`;

    return transactionNumber;
};


module.exports = {issueLoan, getAllLoans, updateLoan, getSingleLoan ,deleteMultipleLoans}