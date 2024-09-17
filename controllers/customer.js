const CustomerModel = require("../models/customer")
const BranchModel = require("../models/branch")
const {uploadFile} = require("../helpers/avatar");

async function createCustomer(req, res) {
    try {
        const {companyId} = req.params
        const {branch} = req.query

        const {
            firstName,
            middleName,
            lastName,
            email,
            contact,
            dob,
            drivingLicense,
            landline,
            joiningDate,
            panCard,
            aadharCard,
            otpContact,
            businessType,
            loanType,
            permanentAddress,
            temporaryAddress
        } = req.body

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;


        const isCustomerExist = await CustomerModel.exists({
            company: companyId,
            branch,
            deleted_at: null,
            $or: [
                {email: email},
                {contact: contact}
            ]
        });

        if (isCustomerExist) return res.json({status: 400, message: "Customer already exist."})
        const customerBranch = await BranchModel.findById(branch).select("branchCode")

        const branchCode = customerBranch.branchCode;

        const customerCount = await CustomerModel.countDocuments({});

        const nextCustomerSeq = customerCount + 1;

        const paddedSeq = nextCustomerSeq.toString().padStart(5, '0');

        const customerCode = `C${branchCode}${paddedSeq}`;

        const customer = await CustomerModel.create({
            company: companyId,
            branch,
            avatar_url: avatar,
            customerCode,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            dob,
            drivingLicense,
            landline,
            joiningDate,
            panCard,
            aadharCard,
            otpContact,
            businessType,
            loanType,
            permanentAddress,
            temporaryAddress
        })

        return res.json({status: 201, message: "Customer created successfully", data: customer})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllCustomers(req, res) {
    try {
        const {companyId} = req.params;

        const { branch } = req.query;

        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        const customers = await CustomerModel.find(query).populate([{path: "company"}, {path: "branch"}])

        return res.json({status: 200, data: customers})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateCustomerProfile(req, res) {
    try {
        const {customerId} = req.params;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, {avatar_url: avatar}, {new: true})

        return res.json({status: 200, data: updatedCustomer, message: "Profile pic updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateCustomer(req, res) {
    try {
        const {customerId} = req.params;

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, req.body, {new: true})

        return res.json({status: 200, data: updatedCustomer, message: "Customer updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleCustomer(req, res) {
    try {
        const {customerId} = req.params;

        const customer = await CustomerModel.findById(customerId).populate([{path: "company"}, {path: "branch"}])

        return res.json({status: 200, data: customer})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleCustomers (req,res){
    try{
        const {ids} = req.body;
        await CustomerModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Customers deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {createCustomer, getAllCustomers, updateCustomerProfile, updateCustomer, getSingleCustomer, deleteMultipleCustomers}