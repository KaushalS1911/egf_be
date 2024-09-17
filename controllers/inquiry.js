const InquiryModel = require("../models/inquiry")


async function addInquiry(req, res) {
    try {
        const {companyId, branchId} = req.params;

        const {
            firstName, lastName, email, contact, date, inquiryFor, remark
        } = req.body

        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch: branchId,
            $or: [
                { email: email },
                { contact: contact }
            ],
            deleted_at: null
        })

        if (isInquiryExist) return res.json({status: 400, message: "Inquiry already exist"})

        const inquiry = await InquiryModel.create({
            company: companyId, branch: branchId,
            firstName, lastName, email, contact, date, inquiryFor, remark
        })

        return res.json({status: 200, data: inquiry, message: "Inquiry created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllInquiries(req, res) {
    try {
        const {companyId} = req.params;

        const inquiries = await InquiryModel.find({
            company: companyId,
            deleted_at: null
        }).populate([{path: "company"}, {path: "branch"}])

        return res.json({status: 200, data: inquiries})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateInquiry(req, res) {
    try {
        const {companyId, branchId, inquiryId} = req.params;

        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch: branchId,
            $or: [
                { email: req.body.email },
                { contact: req.body.contact }
            ],
            deleted_at: null
        })

        if (isInquiryExist) return res.json({status: 400, message: "Inquiry already exist"})

        const updatedInquiry = await InquiryModel.findByIdAndUpdate(inquiryId, req.body, {new: true})

        return res.json({status: 200, data: updatedInquiry, message: "Inquiry updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleInquiry(req, res) {
    try {
        const {companyId, inquiryId} = req.params;

        const inquiry = await InquiryModel.findById(inquiryId).populate([{path: "company"}, {path: "branch"}])

        return res.json({status: 200, data: inquiry})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleInquiries(req, res) {
    try {
        const {ids} = req.body;
        await InquiryModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );
        return res.json({status: 200, message: "Inquiry deleted successfully"});
    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addInquiry, getAllInquiries, updateInquiry, getSingleInquiry, deleteMultipleInquiries}