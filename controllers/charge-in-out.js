const ChargeInOutModel = require('../models/charge-in-out');
const BranchModel = require('../models/branch');
const CompanyModel = require('../models/company');

async function validateCompany(companyId) {
    return await CompanyModel.findById(companyId);
}

async function addChargeInOut(req, res) {
    try {
        const { companyId } = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const charge = await ChargeInOutModel.create({
            ...req.body,
            company: companyId,
        });

        return res.status(201).json({
            status: 201,
            message: "ChargeInOut created successfully",
            data: charge
        });
    } catch (err) {
        console.error("Error creating chargeInOut:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllChargesInOut(req, res) {
    try {
        const { companyId } = req.params;
        const { branchId } = req.query;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branchId) {
            const branchDoc = await BranchModel.findOne({_id: branchId, company: companyId});
            if (!branchDoc) {
                return res.status(400).json({status: 400, message: "Invalid or unauthorized branch for this company"});
            }
            query.branch = branchId;
        }

        const charges = await ChargeInOutModel.find(query)
            .populate('company')
            .populate('branch')
            .sort({date: -1});

        return res.status(200).json({ status: 200, data: charges });
    } catch (err) {
        console.error("Error fetching chargeInOut records:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleChargeInOut(req, res) {
    try {
        const {companyId, chargeId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const charge = await ChargeInOutModel.findOne({_id: chargeId, company: companyId, deleted_at: null})
            .populate('company')
            .populate('branch');

        if (!charge) {
            return res.status(404).json({ status: 404, message: "ChargeInOut not found" });
        }

        return res.status(200).json({ status: 200, data: charge });
    } catch (err) {
        console.error("Error fetching chargeInOut:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateChargeInOut(req, res) {
    try {
        const {companyId, chargeId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const updatedCharge = await ChargeInOutModel.findOneAndUpdate(
            {_id: chargeId, company: companyId, deleted_at: null},
            req.body,
            { new: true }
        );

        if (!updatedCharge) {
            return res.status(404).json({status: 404, message: "ChargeInOut not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "ChargeInOut updated successfully",
            data: updatedCharge
        });
    } catch (err) {
        console.error("Error updating chargeInOut:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteChargeInOut(req, res) {
    try {
        const {chargeId, companyId} = req.params;

        const company = await validateCompany(companyId);
        if (!company) {
            return res.status(404).json({status: 404, message: "Company not found"});
        }

        const deleted = await ChargeInOutModel.findOneAndUpdate(
            {_id: chargeId, company: companyId, deleted_at: null},
            {deleted_at: new Date()},
            {new: true}
        );

        if (!deleted) {
            return res.status(404).json({status: 404, message: "ChargeInOut not found or already deleted"});
        }

        return res.status(200).json({
            status: 200,
            message: "ChargeInOut soft deleted successfully",
            data: deleted,
        });
    } catch (err) {
        console.error("Error deleting chargeInOut:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    addChargeInOut,
    getAllChargesInOut,
    getSingleChargeInOut,
    updateChargeInOut,
    deleteChargeInOut,
};
