const CaratModel = require("../models/carat");

async function addCarat(req, res) {
    const { companyId } = req.params;
    const { name, caratPercentage, remark } = req.body;

    try {
        const isCaratExist = await CaratModel.exists({
            company: companyId,
            name,
            deleted_at: null,
        });

        if (isCaratExist) {
            return res.status(400).json({ status: 400, message: "Carat details already exist" });
        }

        const carat = await CaratModel.create({
            company: companyId,
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

    try {
        const carats = await CaratModel.find({
            company: companyId,
            deleted_at: null,
        }).populate("company");

        return res.status(200).json({ status: 200, data: carats });
    } catch (err) {
        console.error("Error fetching carats:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCarat(req, res) {
    const { caratId } = req.params;

    try {
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

mo
