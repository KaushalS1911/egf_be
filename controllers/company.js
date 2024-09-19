const CompanyModel = require("../models/company")
const {uploadFile} = require("../helpers/avatar");

async function getSingleCompany(req, res) {
    try {
        const {companyId} = req.params;

        const data = await CompanyModel.findById(companyId)

        return res.json({status: 200, data})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateCompany(req, res) {
    try {
        console.log(req.body)
        const {companyId} = req.params;

        const updatedCompany = await CompanyModel.findByIdAndUpdate(companyId, req.body, {new: true})

        return res.json({status: 200, data: updatedCompany, message: "Company details updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateCompanyLogo(req, res) {
    try {
        const {companyId} = req.params;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        await CompanyModel.findByIdAndUpdate(companyId, {logo_url: avatar}, {new: true})

        return res.json({status: 200, message: "Company logo updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {updateCompany,getSingleCompany,updateCompanyLogo}