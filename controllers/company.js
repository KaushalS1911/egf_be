const CompanyModel = require("../models/company")

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
        const {companyId} = req.params;

        const updatedCompany = await CompanyModel.findByIdAndUpdate(companyId, req.body, {new: true})

        return res.json({status: 200, data: updatedCompany, message: "Company details updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {updateCompany,getSingleCompany}