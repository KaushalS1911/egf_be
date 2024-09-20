const SchemeModel = require("../models/scheme")


async function addScheme(req, res) {
    try {
        const {companyId} = req.params;

        const {
            name, interestRate, interestPeriod, schemeType, valuation, renewalTime, minLoanTime, ratePerGram, remark
        } = req.body

        const isSchemeExist = await SchemeModel.exists({
            company: companyId,
            interestRate,
            name,
            deleted_at: null
        })

        if (isSchemeExist) return res.json({status: 400, message: "Scheme already exist"})

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
        })

        return res.json({status: 200, data: scheme, message: "Scheme created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllSchemes(req, res) {
    try {
        const {companyId} = req.params;

        const schemes = await SchemeModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: schemes})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateScheme(req, res) {
    try {
        const {companyId, schemeId} = req.params;

        const isSchemeExist = await SchemeModel.exists({
            company: companyId,
            interestRate: req.body.interestRate,
            name: req.body.name,
            deleted_at: null,
            _id: {$ne: schemeId}
        })

        if (isSchemeExist) return res.json({status: 400, message: "Scheme already exist"})

        const updatedScheme = await SchemeModel.findByIdAndUpdate(schemeId, req.body, {new: true})

        return res.json({status: 200, data: updatedScheme, message: "Scheme updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleScheme(req, res) {
    try {
        const {companyId, schemeId} = req.params;

        const scheme = await SchemeModel.findById(schemeId).populate("company")

        return res.json({status: 200, data: scheme})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleSchemes(req, res) {
    try {
        const {ids} = req.body;
        await SchemeModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );
        return res.json({status: 200, message: "Scheme deleted successfully"});
    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addScheme, getAllSchemes, updateScheme, getSingleScheme, deleteMultipleSchemes}