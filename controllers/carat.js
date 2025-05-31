const CaratModel = require("../models/carat");

async function addCarat(req, res) {
    const { companyId } = req.params;
    const {name, caratPercentage, remark, branch} = req.body;

    try {
        const isCaratExist = await CaratModel.exists({
            company: companyId,
            branch,
            name,
            deleted_at: null,
        });

        if (isCaratExist) {
            return res.status(400).json({ status: 400, message: "Carat details already exist" });
        }

        const carat = await CaratModel.create({
            company: companyId,
            branch,
            name,
            caratPercentage,
            remark,
        });

        return res.status(201).json({ status: 201, data: carat, message: "Carat details created successfully" });
    } catch (err) {
        console.error("Error adding carat:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllCarats(req, res) {
    const { companyId } = req.params;
    const {branchId} = req.query;

    try {
        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branchId) {
            query.branch = branchId;
        }

        const carats = await CaratModel.find(query)
            .populate("company")
            .populate("branch")
            .sort({name: 1});

        return res.status(200).json({ status: 200, data: carats });
    } catch (err) {
        console.error("Error fetching carats:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCarat(req, res) {
    const { caratId } = req.params;
    const {name, caratPercentage, remark, branch, company} = req.body;

    try {
        const isCaratExist = await CaratModel.exists({
            _id: {$ne: caratId},
            company,
            branch,
            name,
            deleted_at: null,
        });

        if (isCaratExist) {
            return res.status(400).json({status: 400, message: "Carat details already exist"});
        }

        const updatedCarat = await CaratModel.findByIdAndUpdate(caratId, req.body, { new: true });

        if (!updatedCarat) {
            return res.status(404).json({ status: 404, message: "Carat not found" });
        }

        return res.status(200).json({ status: 200, data: updatedCarat, message: "Carat updated successfully" });
    } catch (err) {
        console.error("Error updating carat:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleCarat(req, res) {
    const { caratId } = req.params;

    try {
        const carat = await CaratModel.findById(caratId).populate("company");

        if (!carat) {
            return res.status(404).json({ status: 404, message: "Carat not found" });
        }

        return res.status(200).json({ status: 200, data: carat });
    } catch (err) {
        console.error("Error fetching carat:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleCarats(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !ids.length) {
            return res.status(400).json({ status: 400, message: "No IDs provided" });
        }

        await CaratModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 200, message: "Carat details deleted successfully" });
    } catch (err) {
        console.error("Error deleting carats:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addCarat, getAllCarats,updateCarat,getSingleCarat, deleteMultipleCarats }
