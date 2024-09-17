const LoanModel = require("../models/loan")


async function addLoan(req, res) {
    try {
        const {companyId} = req.params;

        const {loanType,remark} = req.body

        const isLoanExist = await LoanModel.exists({
            company: companyId,
            loanType,
            deleted_at: null
        })

        if(isLoanExist) return res.json({status: 400, message: "Loan details already exist"})

        const loan = await LoanModel.create({
            company: companyId, loanType, remark
        })

        return res.json({status: 200, data: loan, message: "Loan details created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllLoans(req, res) {
    try {
        const {companyId} = req.params;

        const loans = await LoanModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: loans})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateLoan(req, res) {
    try {
        const {companyId, loanId} = req.params;

        const updatedLoan = await LoanModel.findByIdAndUpdate(loanId, req.body, {new: true})

        return res.json({status: 200, data: updatedLoan, message: "Loan type updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleLoan(req, res) {
    try {
        const {companyId, loanId} = req.params;

        const loan = await LoanModel.findById(loanId).populate("company")

        return res.json({status: 200, data: loan})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleLoans (req,res){
    try{
        const {ids} = req.body;
        await LoanModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Loan detail deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addLoan, getAllLoans,updateLoan,getSingleLoan, deleteMultipleLoans}