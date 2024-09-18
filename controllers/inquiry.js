const InquiryModel = require("../models/inquiry")


async function addInquiry(req, res) {
    try {
        const {companyId} = req.params;
        const {branch} = req.query;

        const {
            firstName, lastName, email, contact, date, inquiryFor, remark
        } = req.body

        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch,
            $or: [
                {email: email},
                {contact: contact}
            ],
            deleted_at: null
        })

        if (isInquiryExist) return res.json({status: 400, message: "Inquiry already exist"})

        const inquiry = await InquiryModel.create({
            company: companyId, branch,
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
        const {branch} = req.query;

        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        const inquiries = await InquiryModel.find(query)
            .populate([{path: "company"}, {path: "branch"}]);

        return res.json({status: 200, data: inquiries});

    } catch (err) {
        console.log(err);
        return res.json({status: 500, message: "Internal server error"});
    }
}


async function updateInquiry(req, res) {
    try {
        const {companyId, inquiryId} = req.params;
        const {branch} = req.query

        const isInquiryExist = await InquiryModel.exists({
            company: companyId,
            branch,
            $or: [
                {email: req.body.email},
                {contact: req.body.contact}
            ],
            _id: {$ne: inquiryId},
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
        const {inquiryId} = req.params;

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