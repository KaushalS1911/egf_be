

async function getAllInquiries(req, res) {
    try {
        const { companyId } = req.params;
        const { branch } = req.query;

        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        const inquiries = await InquiryModel.find(query)
            .populate([{ path: "company" }, { path: "branch" }]);

        return res.json({ status: 200, data: inquiries });

    } catch (err) {
        console.log(err);
        return res.json({ status: 500, message: "Internal server error" });
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