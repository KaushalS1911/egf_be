const mongoose = require("mongoose");
const CustomerModel = require("../models/customer");
const CompanyModel = require("../models/company");
const BranchModel = require("../models/branch");
const IssuedLoanModel = require("../models/issued-loan");
const {uploadFile} = require("../helpers/avatar");
const {sendWhatsAppMessage} = require("./common");
const {uploadDir} = require("../constant");

const createCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {companyId} = req.params;
        const {branch} = req.query;
        const customerData = req.body;

        const fileName = `${customerData.firstName}_${customerData.lastName}`;
        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.CUSTOMERS, fileName) : null;

        const isCustomerExist = await CustomerModel.exists({
            deleted_at: null,
            company: companyId,
            branch,
            $or: [
                {aadharCard: customerData.aadharCard},
                {panCard: customerData.panCard},
            ],
        });

        if (isCustomerExist) {
            throw new Error("Customer already exists.");
        }

        const customerCount = await CustomerModel.countDocuments({company: companyId, deleted_at: null}).session(session);
        const paddedSeq = (customerCount + 1).toString().padStart(4, "0");
        const customerCode = `${paddedSeq}`;

        const customer = new CustomerModel({
            ...customerData,
            company: companyId,
            branch,
            avatar_url: avatar,
            customerCode,
        });
        await customer.save({session});

        const company = await CompanyModel.findById(companyId);
        if (!company) {
            throw new Error("Company not found.");
        }

        const branchDetail = await BranchModel.findById(branch)

        try{
            await sendWhatsAppNotification({
                contact: customerData.contact,
                firstName: customerData.firstName,
                middleName: customerData.middleName,
                lastName: customerData.lastName,
                customerCode,
                email: customerData.email,
                company,
                branchContact: branchDetail.contact
            });
        }catch(err){
            console.log("Error failed to send whatsapp message", err)
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            status: 201,
            message: "Customer created successfully",
            data: customer,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({status: 400, message: error.message});
    }
};

const sendWhatsAppNotification = async ({
                                            contact,
                                            firstName,
                                            middleName,
                                            lastName,
                                            customerCode,
                                            email,
                                            company,
                                            branchContact,
                                        }) => {
    const formData = new FormData();
    formData.append("authToken", process.env.WHATSAPP_API_AUTH_TOKEN);
    formData.append("name", `${firstName} ${lastName}`);
    formData.append("sendto", `91${contact}`);
    formData.append("originWebsite", process.env.WHATSAPP_API_ORIGIN_WEBSITE);
    formData.append("templateName", "customer_onboard");
    formData.append("language", process.env.WHATSAPP_API_TEMPLATE_LANGUAGE);
    formData.append("headerdata", company.name);
    formData.append("data[0]", `${firstName} ${middleName} ${lastName}`);
    formData.append("data[1]", company.name);
    formData.append("data[2]", customerCode);
    formData.append("data[3]", email);
    formData.append("data[4]", contact);
    formData.append("data[5]", company.contact);
    formData.append("data[6]", branchContact);
    formData.append("data[7]", company.email);
    formData.append("data[8]", company.name);
    formData.append("data[9]", company.name);

    await sendWhatsAppMessage(formData);
};

async function getAllCustomers(req, res) {
    const {companyId} = req.params;
    const {branch} = req.query;

    try {
        const query = {
            company: companyId,
            deleted_at: null
        };

        if (branch) {
            query.branch = branch;
        }

        const customers = await CustomerModel.find(query)
            .populate("company")
            .populate("branch");

        const updatedCustomers = await Promise.all(customers.map(async (customer) => {
            const hasActiveLoan = await IssuedLoanModel.exists({
                customer: customer._id,
                status: {$ne: "Closed"},
                deleted_at: null,
            });

            customer = customer.toObject();
            customer.isLoan = !!hasActiveLoan;
            return customer;
        }));

        return res.status(200).json({status: 200, data: updatedCustomers});
    } catch (err) {
        console.error("Error fetching customers:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateCustomerProfile(req, res) {
    try {
        const {customerId} = req.params;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.CUSTOMERS, `${req.body.firstName}_${req.body.lastName}`) : null;

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, {avatar_url: avatar}, {new: true});

        if (!updatedCustomer) {
            return res.status(404).json({status: 404, message: "Customer not found."});
        }

        return res.status(200).json({
            status: 200,
            data: updatedCustomer,
            message: "Profile picture updated successfully"
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateCustomer(req, res) {
    try {
        const {customerId} = req.params;

        const payload = req.body
        if (req.query.branch) payload.branch = req.query.branch

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, payload, {new: true});

        if (!updatedCustomer) {
            return res.status(404).json({status: 404, message: "Customer not found."});
        }

        return res.status(200).json({status: 200, data: updatedCustomer, message: "Customer updated successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleCustomer(req, res) {
    const {customerId} = req.params;

    try {
        const customer = await CustomerModel.findById(customerId)
            .populate("company")
            .populate("branch");

        if (!customer) {
            return res.status(404).json({status: 404, message: "Customer not found"});
        }

        return res.status(200).json({status: 200, data: customer});
    } catch (err) {
        console.error("Error fetching customer:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteMultipleCustomers(req, res) {
    try {
        const {ids} = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({status: 400, message: "Invalid customer IDs."});
        }

        await CustomerModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );

        return res.status(200).json({status: 200, message: "Customers deleted successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

module.exports = {
    createCustomer,
    getAllCustomers,
    updateCustomerProfile,
    updateCustomer,
    getSingleCustomer,
    deleteMultipleCustomers
};
