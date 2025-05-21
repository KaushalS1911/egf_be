const Transfer = require('../models/transfer');
const Company = require('../models/company');

async function validateCompany(companyId) {
    return await Company.findById(companyId);
}

async function addTransfer(req, res) {
    try {
        const {companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const transfer = await Transfer.create({
            ...req.body,
            company: companyId,
        });

        return res.status(201).json({
            status: 201,
            message: "Transfer created successfully",
            data: transfer
        });
    } catch (err) {
        console.error("Error creating transfer:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllTransfers(req, res) {
    try {
        const {companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const transfers = await Transfer.find({company: companyId, deleted_at: null})
            .populate('company')

        return res.status(200).json({
            status: 200,
            data: transfers
        });
    } catch (err) {
        console.error("Error fetching transfers:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getTransferById(req, res) {
    try {
        const {id, companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const transfer = await Transfer.findOne({_id: id, company: companyId, deleted_at: null})
            .populate('company')
            .populate('brand');

        if (!transfer) {
            return res.status(404).json({status: 404, message: "Transfer not found"});
        }

        return res.status(200).json({
            status: 200,
            data: transfer
        });
    } catch (err) {
        console.error("Error fetching transfer:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateTransfer(req, res) {
    try {
        const {id, companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const updatedTransfer = await Transfer.findOneAndUpdate(
            {_id: id, company: companyId, deleted_at: null},
            req.body,
            {new: true}
        );

        if (!updatedTransfer) {
            return res.status(404).json({status: 404, message: "Transfer not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "Transfer updated successfully",
            data: updatedTransfer
        });
    } catch (err) {
        console.error("Error updating transfer:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteTransfer(req, res) {
    try {
        const {id, companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const deleted = await Transfer.findOneAndUpdate(
            {_id: id, company: companyId, deleted_at: null},
            {deleted_at: new Date()},
            {new: true}
        );

        if (!deleted) {
            return res.status(404).json({status: 404, message: "Transfer not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "Transfer deleted (soft) successfully",
            data: deleted
        });
    } catch (err) {
        console.error("Error deleting transfer:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    addTransfer,
    getAllTransfers,
    getTransferById,
    updateTransfer,
    deleteTransfer,
};
