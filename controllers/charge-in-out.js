const ChargeInOutModel = require('../models/charge-in-out');
const BranchModel = require('../models/branch');

async function addChargeInOut(req, res) {
    try {
        const { companyId } = req.params;

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

        const query = { company: companyId };

        if (branchId) {
            const branchDoc = await BranchModel.findOne({_id: branchId, company: companyId});
            if (!branchDoc) {
                return res.status(400).json({status: 400, message: "Invalid or unauthorized branch for this company"});
            }
            query.branch = branchId;
        }

        const charges = await ChargeInOutModel.find(query)
            .populate('company')
            .populate('branch');

        return res.status(200).json({ status: 200, data: charges });
    } catch (err) {
        console.error("Error fetching chargeInOut records:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleChargeInOut(req, res) {
    try {
        const { chargeId } = req.params;

        const charge = await ChargeInOutModel.findById(chargeId)
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
        const { chargeId } = req.params;

        const updatedCharge = await ChargeInOutModel.findByIdAndUpdate(
            chargeId,
            req.body,
            { new: true }
        );

        if (!updatedCharge) {
            return res.status(404).json({ status: 404, message: "ChargeInOut not found" });
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
        const { chargeId } = req.params;

        const deleted = await ChargeInOutModel.findByIdAndDelete(chargeId);

        if (!deleted) {
            return res.status(404).json({ status: 404, message: "ChargeInOut not found" });
        }

        return res.status(200).json({ status: 200, message: "ChargeInOut deleted successfully" });
    } catch (err) {
        console.error("Error deleting chargeInOut:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = {
    addChargeInOut,
    getAllChargesInOut,
    getSingleChargeInOut,
    updateChargeInOut,
    deleteChargeInOut
};
