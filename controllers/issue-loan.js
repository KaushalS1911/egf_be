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
            bankDetail,
            amountPaid,
            consultingCharge
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
            loanNo: await generateLoanNumber(companyId),
            transactionNo: await generateTransactionNumber(companyId),
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
            amountPaid,
            consultingCharge
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



const generateTransactionNumber = async (companyId) => {
    const prefix = 'TRXN';

    let count = 0

    count = await IssuedLoanModel.countDocuments({ company: companyId });

    count += 1;

    const numberPart = String(count).padStart(6, '0');

    const transactionNumber = `${prefix}${numberPart}`;

    return transactionNumber;
};

const applyPenaltyIfLate = async (loanId, installmentId, paymentDate) => {
    const loan = await IssuedLoanModel.findById(loanId);
    const installment = loan.installments.id(installmentId);

    const dueDate = new Date(installment.dueDate);
    const daysLate = Math.floor((paymentDate - dueDate) / (1000 * 60 * 60 * 24));

    const scheme = await Sh
    let newInterestRate = 1.5; // Default interest rate
    let penaltyApplied = false;

    // Check if payment is late
    if (daysLate > 7) {
        // Fetch the penalty from the penalty master
        const penaltyMaster = await PenaltyMaster.findOne(); // Assuming you have a PenaltyMaster schema

        // Iterate through the ranges and apply the relevant penalty
        for (let range of penaltyMaster.ranges) {
            if (daysLate >= range.minDays && daysLate <= range.maxDays) {
                newInterestRate += range.penaltyRate; // Increase interest rate by penalty
                penaltyApplied = true;
                break;
            }
        }
    }

    // If payment is on time or within 7 days, no penalty is applied
    if (!penaltyApplied) {
        console.log('No penalty applied. Paid on time or within grace period.');
    }

    // Calculate new interest based on the (possibly penalized) rate
    const daysBetweenInstallments = 30;
    const interestAmount = calculateInterest(loan.totalAmount, newInterestRate, daysBetweenInstallments);

    // Update installment status and set next installment date
    installment.status = 'Paid';
    installment.paidOn = paymentDate;
    loan.nextInstallmentDate = new Date(paymentDate.setDate(paymentDate.getDate() + 30));

    // Save the updated loan
    await loan.save();

    console.log(`Installment paid. Penalty applied: ${penaltyApplied ? 'Yes' : 'No'}, new interest amount: ${interestAmount}`);
};


module.exports = {issueLoan, getAllLoans, updateLoan, getSingleLoan ,deleteMultipleLoans}