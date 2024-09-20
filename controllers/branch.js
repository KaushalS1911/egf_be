const BranchModel = require("../models/branch");

async function addBranch(req, res) {
    const { companyId } = req.params;
    const { name, email, contact, address } = req.body;

    try {
        const isBranchExist = await BranchModel.exists({
            company: companyId,
            name,
            email,
            contact,
            deleted_at: null,
        });

        if (isBranchExist) {
            return res.status(400).json({ status: 400, message: "Branch already exists" });
        }

        const branchCount = await BranchModel.countDocuments({ company: companyId, deleted_at: null });
        const branchCode = String(branchCount + 1).padStart(3, '0');

        const branch = await BranchModel.create({
            company: companyId,
            name,
            email,
            contact,
            branchCode,
            address,
        });

        return res.status(201).json({ status: 201, data: branch, message: "Branch created successfully" });
    } catch (err) {
        console.error("Error adding branch:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllBranches(req, res) {
    const { companyId } = req.params;

    try {
        const branches = await BranchModel.find({
            company: companyId,
            deleted_at: null,
        }).populate("company");

        return res.status(200).json({ status: 200, data: branches });
    } catch (err) {
        console.error("Error fetching branches:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateBranch(req, res) {
    const { branchId } = req.params;

    try {
        const updatedBranch = await BranchModel.findByIdAndUpdate(branchId, req.body, { new: true });

        if (!updatedBranch) {
            return res.status(404).json({ status: 404, message: "Branch not found" });
        }

        return res.status(200).json({ status: 200, data: updatedBranch, message: "Branch updated successfully" });
    } catch (err) {
        console.error("Error updating branch:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleBranch(req, res) {
    const { branchId } = req.params;

    try {
        const branch = await BranchModel.findById(branchId).populate("company");

        if (!branch) {
            return res.status(404).json({ status: 404, message: "Branch not found" });
        }

        return res.status(200).json({ status: 200, data: branch });
    } catch (err) {
        console.error("Error fetching branch:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleBranches(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !ids.length) {
            return res.status(400).json({ status: 400, message: "No IDs provided" });
        }

        await BranchModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 200, message: "Branches deleted successfully" });
    } catch (err) {
        console.error("Error deleting branches:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addBranch, getAllBranches, updateBranch, getSingleBranch, deleteMultipleBranches };
