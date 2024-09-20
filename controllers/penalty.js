const PenaltyModel = require("../models/penalty");

async function addPenalty(req, res) {
    const { companyId } = req.params;
    const { afterDueDateFromDate, afterDueDateToDate, penaltyInterest, remark } = req.body;

    try {
        const isPenaltyExist = await PenaltyModel.exists({
            company: companyId,
            afterDueDateFromDate,
            afterDueDateToDate,
            penaltyInterest,
            deleted_at: null
        });

        if (isPenaltyExist) {
            return res.status(400).json({ status: 400, message: "Penalty already exists" });
        }

        const penaltyCount = await PenaltyModel.countDocuments({ company: companyId, deleted_at: null });
        const penaltyCode = `P${(penaltyCount + 1).toString().padStart(3, '0')}`;

        const penalty = await PenaltyModel.create({
            company: companyId,
            afterDueDateFromDate,
            afterDueDateToDate,
            penaltyInterest,
            penaltyCode,
            remark
        });

        return res.status(201).json({ status: 201, data: penalty, message: "Penalty detail created successfully" });
    } catch (err) {
        console.error("Error adding penalty:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllPenalties(req, res) {
    const { companyId } = req.params;

    try {
        const penalties = await PenaltyModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company");

        return res.status(200).json({ status: 200, data: penalties });
    } catch (err) {
        console.error("Error fetching penalties:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updatePenalty(req, res) {
    const { penaltyId } = req.params;

    try {
        const updatedPenalty = await PenaltyModel.findByIdAndUpdate(penaltyId, req.body, { new: true });

        if (!updatedPenalty) {
            return res.status(404).json({ status: 404, message: "Penalty not found" });
        }

        return res.status(200).json({ status: 200, data: updatedPenalty, message: "Penalty updated successfully" });
    } catch (err) {
        console.error("Error updating penalty:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSinglePenalty(req, res) {
    const { penaltyId } = req.params;

    try {
        const penalty = await PenaltyModel.findById(penaltyId).populate("company");

        if (!penalty) {
            return res.status(404).json({ status: 404, message: "Penalty not found" });
        }

        return res.status(200).json({ status: 200, data: penalty });
    } catch (err) {
        console.error("Error fetching penalty:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultiplePenalties(req, res) {
    const { ids } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "No penalty IDs provided" });
        }

        const result = await PenaltyModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ status: 404, message: "No penalties found for the provided IDs" });
        }

        return res.status(200).json({ status: 200, message: "Penalty details deleted successfully" });
    } catch (err) {
        console.error("Error deleting penalties:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addPenalty, getAllPenalties, updatePenalty, getSinglePenalty, deleteMultiplePenalties };
