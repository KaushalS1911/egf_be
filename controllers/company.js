const CompanyModel = require("../models/company");
const { uploadFile } = require("../helpers/avatar");

async function getSingleCompany(req, res) {
    const { companyId } = req.params;

    try {
        const company = await CompanyModel.findById(companyId);

        if (!company) {
            return res.status(404).json({ status: 404, message: "Company not found" });
        }

        return res.status(200).json({ status: 200, data: company });
    } catch (err) {
        console.error("Error fetching company:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCompany(req, res) {
    const { companyId } = req.params;

    try {
        const updatedCompany = await CompanyModel.findByIdAndUpdate(companyId, req.body, { new: true });

        if (!updatedCompany) {
            return res.status(404).json({ status: 404, message: "Company not found" });
        }

        return res.status(200).json({ status: 200, data: updatedCompany, message: "Company details updated successfully" });
    } catch (err) {
        console.error("Error updating company:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCompanyLogo(req, res) {
    const { companyId } = req.params;

    try {
        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const updatedCompany = await CompanyModel.findByIdAndUpdate(companyId, { logo_url: avatar }, { new: true });

        if (!updatedCompany) {
            return res.status(404).json({ status: 404, message: "Company not found" });
        }

        return res.status(200).json({ status: 200, message: "Company logo updated successfully", data: updatedCompany });
    } catch (err) {
        console.error("Error updating company logo:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { updateCompany, getSingleCompany, updateCompanyLogo };
