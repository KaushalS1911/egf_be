const mongoose = require('mongoose')
const SchemeModel = require("../models/scheme");

async function addScheme(req, res) {
    const { companyId } = req.params;
    const {
        name, interestRate, interestPeriod, schemeType, valuation, renewalTime, minLoanTime, ratePerGram, remark
    } = req.body;

    try {
        const isSchemeExist = await SchemeModel.exists({
            company: companyId,
            interestRate,
            name,
            deleted_at: null
        });

        if (isSchemeExist) {
            return res.status(400).json({ status: 400, message: "Scheme already exists" });
        }

        const scheme = await SchemeModel.create({
            company: companyId,
            name,
            interestRate,
            interestPeriod,
            schemeType,
            valuation,
            renewalTime,
            minLoanTime,
            ratePerGram,
            remark
        });

        return res.status(201).json({ status: 201, data: scheme, message: "Scheme created successfully" });
    } catch (err) {
        console.error("Error adding scheme:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllSchemes(req, res) {
    const { companyId } = req.params;

    try {
        const schemes = await SchemeModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company");

        return res.status(200).json({ status: 200, data: schemes });
    } catch (err) {
        console.error("Error fetching schemes:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateScheme(req, res) {
    const { companyId, schemeId } = req.params;

    try {
        const isSchemeExist = await SchemeModel.exists({
            company: companyId,
            interestRate: req.body.interestRate,
            name: req.body.name,
            deleted_at: null,
            _id: { $ne: schemeId }
        });

        if (isSchemeExist) {
            return res.status(400).json({ status: 400, message: "Scheme already exists" });
        }

        const updatedScheme = await SchemeModel.findByIdAndUpdate(schemeId, req.body, { new: true });

        if (!updatedScheme) {
            return res.status(404).json({ status: 404, message: "Scheme not found" });
        }

        return res.status(200).json({ status: 200, data: updatedScheme, message: "Scheme updated successfully" });
    } catch (err) {
        console.error("Error updating scheme:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateMultipleSchemes(req, res) {
    const { schemes } = req.body;
    const updatedSchemes = [];

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const scheme of schemes) {
            const { schemeId } = scheme;

            const updatedScheme = await SchemeModel.findByIdAndUpdate (
                schemeId,
                scheme,
                { new: true, session }
            );

            if (!updatedScheme) {
                await session.abortTransaction();
                await session.endSession();
                return res.status(404).json({ status: 404, message: `Scheme not found for ID: ${schemeId}` });
            }

            updatedSchemes.push(updatedScheme);
        }

        await session.commitTransaction();
        await session.endSession();

        return res.status(200).json({ status: 200, data: updatedSchemes, message: "Schemes updated successfully" });

    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error("Error updating schemes:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}


async function getSingleScheme(req, res) {
    const { schemeId } = req.params;

    try {
        const scheme = await SchemeModel.findById(schemeId).populate("company");

        if (!scheme) {
            return res.status(404).json({ status: 404, message: "Scheme not found" });
        }

        return res.status(200).json({ status: 200, data: scheme });
    } catch (err) {
        console.error("Error fetching scheme:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleSchemes(req, res) {
    const { ids } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "No scheme IDs provided" });
        }

        const result = await SchemeModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ status: 404, message: "No schemes found for the provided IDs" });
        }

        return res.status(200).json({ status: 200, message: "Scheme(s) deleted successfully" });
    } catch (err) {
        console.error("Error deleting schemes:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addScheme, getAllSchemes, updateScheme, getSingleScheme, deleteMultipleSchemes, updateMultipleSchemes };
