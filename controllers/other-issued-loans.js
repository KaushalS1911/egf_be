const mongoose = require("mongoose");
const OtherIssuedLoanModel = require("../models/other-issued-loan");
const OtherLoanInterestModel = require("../models/other-loan-interest-payment");
const OtherLoanCloseModel = require("../models/other-loan-close");
const {getCurrentFinancialYear} = require("./issue-loan");

async function addOtherLoan(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {companyId} = req.params

        const issuedLoan = await OtherIssuedLoanModel.create({
            ...req.body,
            company: companyId,
            otherLoanNumber: await generateLoanNumber(companyId)
        })
        await issuedLoan.save({session});
        await session.commitTransaction();
        await session.endSession();

        return res.status(201).json({status: 201, message: "Other Loan issued successfully", data: issuedLoan});
    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllOtherLoans(req, res) {
    try {
        const {companyId} = req.params

        let query = {
            company: companyId,
            deleted_at: null
        }

        const loans = await OtherIssuedLoanModel.find(query)
            .populate({
                path: "loan",
                populate: [{path: "customer"},{path: "scheme"}],
            })

        return res.status(200).json({status: 200, data: loans});
    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateOtherLoan(req, res) {
    try {
        const {loanId} = req.params;

        let payload = req.body

        const updatedLoan = await OtherIssuedLoanModel.findByIdAndUpdate(loanId, payload, {new: true});

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Other Loan details not found."});
        }

        return res.status(200).json({status: 200, data: updatedLoan, message: "Other Loan updated successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleOtherLoan(req, res) {
    const {loanId} = req.params;

    try {
        const loan = await OtherIssuedLoanModel.findById(loanId)
            .populate("customer")
            .populate("scheme");

        if (!loan) {
            return res.status(404).json({status: 404, message: "Other Loan Details not found"});
        }

        return res.status(200).json({status: 200, data: loan});
    } catch (err) {
        console.error("Error fetching loan:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteMultipleOtherLoans(req, res) {
    try {
        const {ids} = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({status: 400, message: "Invalid loan IDs."});
        }

        await OtherIssuedLoanModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );

        return res.status(200).json({status: 200, message: "Other Loans deleted successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function otherLoanInterestPayment(req,res){
    try{
        const {loanId} = req.params;

        const interestDetails = await OtherLoanInterestModel.create({...req.body, otherLoan: loanId})

        return res.status(200).json({status: 200, message: "Interest payment success", data: interestDetails});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

async function getAllInterestsOfOtherLoan(req,res){
    try{
        const {loanId} = req.params;

        const interestDetails = await OtherLoanInterestModel.find({otherLoan: loanId}).populate("otherLoan")

        return res.status(200).json({status: 200, data: interestDetails});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

async function deleteOtherLoanInterest(req,res){
    try{
        const {id} = req.params;

        const interestDetails = await OtherLoanInterestModel.findByIdAndDelete(id, req.body, {new: true})

        return res.status(200).json({status: 200, data: interestDetails, message: "Other Loans interest details updated successfully"});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

async function otherLoanClose(req,res){
    try{
        const {loanId} = req.params;

        const loanDetails = await OtherLoanCloseModel.create({...req.body, otherLoan: loanId})

        await OtherIssuedLoanModel.findByIdAndUpdate(loanId, {status: "Closed"}, {new: true})

        return res.status(200).json({status: 200, message: "Other loan closed successfully", data: loanDetails});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

async function getClosedOtherLoan(req,res){
    try{
        const {loanId} = req.params;

        const loanDetails = await OtherLoanCloseModel.find({otherLoan: loanId}).populate("loan")

        return res.status(200).json({status: 200, data: loanDetails});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

async function deleteOtherLoanClosingDetails(req,res){
    try{
        const {id} = req.params;

        const loanDetails = await OtherLoanCloseModel.findByIdAndDelete(id, req.body, {new: true})

        await OtherIssuedLoanModel.findByIdAndUpdate(loanId, {isActive: true}, {new: true})

        return res.status(200).json({status: 200, data: loanDetails, message: "Other Loans close details updated successfully"});

    }catch (e) {
        console.error(e)
        return res.json({status: 500, message: "Internal server error"});
    }
}

const generateLoanNumber = async (companyId) => {
    const financialYear = getCurrentFinancialYear();

    const loanCount = await OtherIssuedLoanModel.countDocuments({
        company: companyId,
        otherNumber: {$regex: `^EGF/${financialYear}`}
    });

    const newLoanCount = loanCount + 1;

    return `EGF/${financialYear}_${String(newLoanCount).padStart(6, '0')}`;
};

module.exports = {addOtherLoan, getAllOtherLoans, getSingleOtherLoan, deleteMultipleOtherLoans, updateOtherLoan, otherLoanInterestPayment, getAllInterestsOfOtherLoan, deleteOtherLoanInterest, otherLoanClose, getClosedOtherLoan, deleteOtherLoanClosingDetails};