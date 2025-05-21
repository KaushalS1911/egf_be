const ExpenseModel = require("../models/expense");
const CompanyModel = require("../models/company");
const {uploadFile} = require("../helpers/avatar");
const {uploadDir} = require("../constant");

async function validateCompany(companyId) {
    return await CompanyModel.findById(companyId);
}

async function addExpense(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const avatar = req.file && req.file.buffer
            ? await uploadFile(req.file.buffer, uploadDir.EXPENSES, req.file.originalname)
            : null;

        const expense = await ExpenseModel.create({
            ...req.body,
            company: companyId,
            branch,
            invoice: avatar ?? ''
        });

        return res.status(201).json({
            status: 201,
            message: "Expense created successfully",
            data: expense
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllExpenses(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        const expenses = await ExpenseModel.find(query).populate('company')
            .populate('branch').sort({date: -1});

        return res.status(200).json({status: 200, data: expenses});
    } catch (err) {
        console.error("Error fetching expenses:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateExpense(req, res) {
    try {
        const {companyId, expenseId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const avatar = req.file && req.file.buffer
            ? await uploadFile(req.file.buffer, uploadDir.EXPENSES, req.file.originalname)
            : null;

        const payload = avatar ? {...req.body, invoice: avatar} : req.body;

        const updatedExpense = await ExpenseModel.findOneAndUpdate(
            {_id: expenseId, company: companyId, deleted_at: null},
            payload,
            {new: true}
        );

        if (!updatedExpense) {
            return res.status(404).json({status: 404, message: "Expense not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "Expense updated successfully",
            data: updatedExpense
        });
    } catch (err) {
        console.error("Error updating expense:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleExpense(req, res) {
    try {
        const {companyId, expenseId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const expense = await ExpenseModel.findOne({_id: expenseId, company: companyId, deleted_at: null});

        if (!expense) {
            return res.status(404).json({status: 404, message: "Expense not found"});
        }

        return res.status(200).json({status: 200, data: expense});
    } catch (err) {
        console.error("Error fetching expense:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteExpense(req, res) {
    try {
        const {companyId, expenseId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const deleted = await ExpenseModel.findOneAndUpdate(
            {_id: expenseId, company: companyId, deleted_at: null},
            {deleted_at: new Date()},
            {new: true}
        );

        if (!deleted) {
            return res.status(404).json({status: 404, message: "Expense not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "Expense soft deleted successfully",
            data: deleted
        });
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
