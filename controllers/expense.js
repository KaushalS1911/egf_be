const ExpenseModel = require("../models/expense");
const {uploadFile} = require("../helpers/avatar");
const {uploadDir} = require("../constant");

async function addExpense(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.EXPENSES, req.file.originalname) : null;

        const expense = await ExpenseModel.create({...req.body, company: companyId, branch, invoice: avatar ?? ''});

        return res.status(201).json({status: 201, message: "Expense created successfully", data: expense});

    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllExpenses(req, res) {
    const {companyId} = req.params;
    const {branch} = req.query;

    try {
        const query = {
            company: companyId,
        };

        if (branch) {
            query['branch'] = branch;
        }

        const expenses = await ExpenseModel.find(query)

        return res.status(200).json({status: 200, data: expenses});
    } catch (err) {
        console.error("Error fetching employees:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateExpense(req, res) {
    try {
        const {expenseId} = req.params;
        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.EXPENSES, req.file.originalname) : null;

        const payload = avatar ? {...req.body, invoice: avatar} : req.body;

        const updatedExpense = await ExpenseModel.findByIdAndUpdate(
            expenseId,
            payload,
            {new: true}
        );

        return res.status(200).json({status: 200, message: "Expense updated successfully"});
    } catch (err) {
        console.error("Error updating employee:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleExpense(req, res) {
    const {expenseId} = req.params;

    try {
        const expense = await ExpenseModel.findById(expenseId)

        return res.status(200).json({status: 200, data: expense});
    } catch (err) {
        console.error("Error fetching employee:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}s

async function deleteExpense(req, res) {
    try {
        const {expenseId} = req.params;

        await ExpenseModel.findByIdAndDelete(expenseId);

        return res.status(200).json({status: 200, message: "Expense deleted successfully."});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    addExpense,
    getAllExpenses,
    updateExpense,
    getSingleExpense,
    deleteExpense
};
