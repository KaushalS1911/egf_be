const OtherIncomeModel = require("../models/other-income");
const {uploadFile} = require("../helpers/avatar");
const {uploadDir} = require("../constant");

async function addOtherIncome(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.OTHER_INCOMES, req.file.originalname) : null;

        const otherIncome = await OtherIncomeModel.create({...req.body, company: companyId, branch, invoice: avatar ?? ''});

        return res.status(201).json({status: 201, message: "Other income added successfully", data: otherIncome});

    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllOtherIncomes(req, res) {
    const {companyId} = req.params;
    const {branch} = req.query;

    try {
        const query = {
            company: companyId,
        };

        if (branch) {
            query['branch'] = branch;
        }

        const otherIncomes = await OtherIncomeModel.find(query)

        return res.status(200).json({status: 200, data: otherIncomes});
    } catch (err) {
        console.error("Error fetching other incomes:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateOtherIncome(req, res) {
    try {
        const {incomeId} = req.params;
        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.OTHER_INCOMES, req.file.originalname) : null;

        const payload = avatar ? {...req.body, invoice: avatar} : req.body;

        const updatedIncomes = await OtherIncomeModel.findByIdAndUpdate(
            incomeId,
            payload,
            {new: true}
        );

        return res.status(200).json({status: 200, message: "Other income updated successfully"});
    } catch (err) {
        console.error("Error updating other income:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleOtherIncome(req, res) {
    const {incomeId} = req.params;

    try {
        const income = await OtherIncomeModel.findById(incomeId)

        return res.status(200).json({status: 200, data: income});
    } catch (err) {
        console.error("Error fetching other income:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteOtherIncome(req, res) {
    try {
        const {incomeId} = req.params;

        await OtherIncomeModel.findByIdAndDelete(incomeId);

        return res.status(200).json({status: 200, message: "Other income deleted successfully."});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    addOtherIncome,
    getAllOtherIncomes,
    updateOtherIncome,
    getSingleOtherIncome,
    deleteOtherIncome
};
