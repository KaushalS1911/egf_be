const mongoose = require("mongoose");
const CustomerModel = require("../models/customer");
const BranchModel = require("../models/branch");
const CompanyModel = require("../models/company");
const { uploadFile } = require("../helpers/avatar");
const {sendWhatsAppMessage} = require("./common");

const createCustomer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { companyId } = req.params;
        const { branch } = req.query;
        const customerData = req.body;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const isCustomerExist = await CustomerModel.exists({
            deleted_at: null,
            company: companyId,
            $or: [
                { aadharCard: customerData.aadharCard },
                { panCard: customerData.panCard },
            ],
        });

        if (isCustomerExist) {
            throw new Error("Customer already exists.");
        }

        const customerBranch = await BranchModel.findById(branch).select("branchCode").session(session);
        if (!customerBranch) {
            throw new Error("Branch not found.");
        }
        const branchCode = customerBranch.branchCode;

        const customerCount = await CustomerModel.countDocuments({}).session(session);
        const paddedSeq = (customerCount + 1).toString().padStart(5, "0");
        const customerCode = `C${branchCode}${paddedSeq}`;

        const customer = new CustomerModel({
            ...customerData,
            company: companyId,
            branch,
            avatar_url: avatar,
            customerCode,
        });
        await customer.save({ session });

        const company = await CompanyModel.findById(companyId);
        if (!company) {
            throw new Error("Company not found.");
        }

        await sendWhatsAppNotification({
            contact: customerData.contact,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            customerCode,
            email: customerData.email,
            company,
        });

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
        return res.status(400).json({ status: 400, message: error.message });
    }
};

const sendWhatsAppNotification = async ({
                                            contact,
                                            firstName,
                                            lastName,
                                            customerCode,
                                            email,
                                            company,
                                        }) => {
    const formData = new FormData();
    formData.append("authToken", process.env.WHATSAPP_API_AUTH_TOKEN);
    formData.append("name", `${firstName} ${lastName}`);
    formData.append("sendTo", `91${contact}`);
    formData.append("originWebsite", process.env.WHATSAPP_API_ORIGIN_WEBSITE);
    formData.append("templateName", "customer_onboard");
    formData.append("language", process.env.WHATSAPP_API_TEMPLATE_LANGUAGE);
    formData.append("headerdata", company.name);
    formData.append("data[0]", `${firstName} ${lastName}`);
    formData.append("data[1]", company.name);
    formData.append("data[2]", customerCode);
    formData.append("data[3]", email);
    formData.append("data[4]", contact);
    formData.append("data[5]", company.contact);
    formData.append("data[6]", company.email);
    formData.append("data[7]", company.name);
    formData.append("data[8]", company.name);

    await sendWhatsAppMessage(formData);
};


async function getAllCustomers(req, res) {
    const { companyId } = req.params;
    const { branch } = req.query;

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
            .populate("branch")


        return res.status(200).json({ status: 200, data: customers });
    } catch (err) {
        console.error("Error fetching customers:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCustomerProfile(req, res) {
    try {
        const { customerId } = req.params;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, { avatar_url: avatar }, { new: true });

        if (!updatedCustomer) {
            return res.status(404).json({ status: 404, message: "Customer not found." });
        }

        return res.status(200).json({ status: 200, data: updatedCustomer, message: "Profile picture updated successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateCustomer(req, res) {
    try {
        const { customerId } = req.params;

        const payload = req.body
        if(req.query.branch) payload.branch = req.query.branch

        const updatedCustomer = await CustomerModel.findByIdAndUpdate(customerId, payload, { new: true });

        if (!updatedCustomer) {
            return res.status(404).json({ status: 404, message: "Customer not found." });
        }

        return res.status(200).json({ status: 200, data: updatedCustomer, message: "Customer updated successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleCustomer(req, res) {
    const { customerId } = req.params;

    try {
        const customer = await CustomerModel.findById(customerId)
            .populate("company")
            .populate("branch");

        if (!customer) {
            return res.status(404).json({ status: 404, message: "Customer not found" });
        }

        return res.status(200).json({ status: 200, data: customer });
    } catch (err) {
        console.error("Error fetching customer:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleCustomers(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "Invalid customer IDs." });
        }

        await CustomerModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 200, message: "Customers deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { createCustomer, getAllCustomers, updateCustomerProfile, updateCustomer, getSingleCustomer, deleteMultipleCustomers };
