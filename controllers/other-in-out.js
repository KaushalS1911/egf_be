const OtherInOutModel = require('../models/other-in-out');
const BranchModel = require('../models/branch');

async function addOtherInOut(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query;

        if (branch) {
            const branchDoc = await BranchModel.findOne({_id: branch, company: companyId});
            if (!branchDoc) {
                return res.status(400).json({
                    status: 400,
                    message: "Invalid or unauthorized branch for this company"
                });
            }
        }

        const otherInOut = await OtherInOutModel.create({
            ...req.body,
            company: companyId,
            branch
        });

        return res.status(201).json({
            status: 201,
            message: "OtherInOut created successfully",
            data: otherInOut
        });
    } catch (err) {
        console.error("Error creating OtherInOut:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error"
        });
    }
}

async function getAllOtherInOuts(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query;

        const query = {company: companyId};

        if (branch) {
            const branchDoc = await BranchModel.findOne({_id: branch, company: companyId});
            if (!branchDoc) {
                return res.status(400).json({
                    status: 400,
                    message: "Invalid or unauthorized branch for this company"
                });
            }
            query.branch = branch;
        }

        const otherInOuts = await OtherInOutModel.find(query)
            .populate('company')
            .populate('branch');

        return res.status(200).json({status: 200, data: otherInOuts});
    } catch (err) {
        console.error("Error fetching OtherInOut records:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error"
        });
    }
}

async function getOtherInOutById(req, res) {
    try {
        const {id} = req.params;
        const data = await OtherInOutModel.findById(id).populate('company branch');
        if (!data) {
            return res.status(404).json({status: 404, message: "OtherInOut not found"});
        }
        return res.status(200).json({status: 200, data});
    } catch (err) {
        console.error("Error fetching OtherInOut:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateOtherInOut(req, res) {
    try {
        const {id} = req.params;
        const updated = await OtherInOutModel.findByIdAndUpdate(id, req.body, {new: true});
        if (!updated) {
            return res.status(404).json({status: 404, message: "OtherInOut not found"});
        }
        return res.status(200).json({
            status: 200,
            message: "OtherInOut updated successfully",
            data: updated
        });
    } catch (err) {
        console.error("Error updating OtherInOut:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteOtherInOut(req, res) {
    try {
        const {id} = req.params;
        const deleted = await OtherInOutModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({status: 404, message: "OtherInOut not found"});
        }
        return res.status(200).json({
            status: 200,
            message: "OtherInOut deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting OtherInOut:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    addOtherInOut,
    getAllOtherInOuts,
    getOtherInOutById,
    updateOtherInOut,
    deleteOtherInOut
};
