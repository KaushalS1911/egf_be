const CompanyModel = require("../models/company")

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

module.exports = {updateCompany}