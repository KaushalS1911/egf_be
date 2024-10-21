const InquiryModel = require("../models/inquiry")


async function addInquiry(req, res) {
    const {companyId} = req.params;
    const {branch, assignTo} = req.query;
    const {firstName, lastName, email, contact, date, inquiryFor, remark} = req.body;

    try {
        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch,
            $or: [{email}, {contact}],
            deleted_at: null
        });

        if (isInquiryExist) {
            return res.status(400).json({status: 400, message: "Inquiry already exists"});
        }

        const inquiry = await InquiryModel.create({
            company: companyId,
            branch,
            assignTo,
            firstName,
            lastName,
            email,
            contact,
            date,
            inquiryFor,
            remark
        });

        return res.status(200).json({status: 200, data: inquiry, message: "Inquiry created successfully"});
    } catch (err) {
        console.error("Error creating inquiry:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function getAllInquiries(req, res) {
    const {companyId} = req.params;
    const {branch, assignTo} = req.query;

    try {
        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        if (assignTo) {
            query.assignTo = assignTo
        }

        const inquiries = await InquiryModel.find(query)
            .populate("company")
            .populate("branch");

        return res.status(200).json({status: 200, data: inquiries});
    } catch (err) {
        console.error("Error fetching inquiries:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function updateInquiry(req, res) {
    const {companyId, inquiryId} = req.params;
    const {branch, assignTo} = req.query;
    const {email, contact} = req.body;

    try {
        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch, assignTo,
            $or: [{email}, {contact}],
            _id: {$ne: inquiryId},
            deleted_at: null
        });

        if (isInquiryExist) {
            return res.status(400).json({status: 400, message: "Inquiry already exists"});
        }

        const updatedInquiry = await InquiryModel.findByIdAndUpdate(inquiryId, req.body, {new: true});

        if (!updatedInquiry) {
            return res.status(404).json({status: 404, message: "Inquiry not found"});
        }

        return res.status(200).json({status: 200, data: updatedInquiry, message: "Inquiry updated successfully"});
    } catch (err) {
        console.error("Error updating inquiry:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function getSingleInquiry(req, res) {
    const {inquiryId} = req.params;

    try {
        const inquiry = await InquiryModel.findById(inquiryId)
            .populate("company")
            .populate("branch");

        if (!inquiry) {
            return res.status(404).json({status: 404, message: "Inquiry not found"});
        }

        return res.status(200).json({status: 200, data: inquiry});
    } catch (err) {
        console.error("Error fetching inquiry:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function deleteMultipleInquiries(req, res) {
    const {ids} = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({status: 400, message: "No inquiry IDs provided"});
        }

        const result = await InquiryModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({status: 404, message: "No inquiries found for the provided IDs"});
        }

        return res.status(200).json({status: 200, message: "Inquiries deleted successfully"});
    } catch (err) {
        console.error("Error deleting inquiries:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


module.exports = {addInquiry, getAllInquiries, updateInquiry, getSingleInquiry, deleteMultipleInquiries}