const mongoose = require("mongoose");
const CustomerModel = require("../models/customer");
const BranchModel = require("../models/branch");
const { uploadFile } = require("../helpers/avatar");

async function createCustomer(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { companyId } = req.params;
        const { branch } = req.query;

        const {
            firstName,
            middleName,
            lastName,
            email,
            contact,
            dob,
            drivingLicense,
            referenceBy,
            joiningDate,
            panCard,
            aadharCard,
            otpContact,
            businessType,
            loanType,
            permanentAddress,
            temporaryAddress,
            bankDetails,remark
        } = req.body;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const isCustomerExist = await CustomerModel.exists({
            company: companyId,
            branch,
            aadharCard,
            panCard,
            deleted_at: null,
            $or: [{ email }, { contact }]
        });

        if (isCustomerExist) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({ status: 400, message: "Customer already exists." });
        }

        const customerBranch = await BranchModel.findById(branch).select("branchCode").session(session);
        if (!customerBranch) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(404).json({ status: 404, message: "Branch not found." });
        }
        const branchCode = customerBranch.branchCode;

        const customerCount = await CustomerModel.countDocuments({}).session(session);
        const nextCustomerSeq = customerCount + 1;
        const paddedSeq = nextCustomerSeq.toString().padStart(5, '0');

        const customerCode = `C${branchCode}${paddedSeq}`;

        const customer = new CustomerModel({
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
            joiningDate,
            referenceBy,
            panCard,
            aadharCard,
            otpContact,
            businessType,
            loanType,
            permanentAddress,
            temporaryAddress,
            bankDetails,remark
        });

        await customer.save({ session });

        await session.commitTransaction();
        await session.endSession();

        return res.status(201).json({ status: 201, message: "Customer created successfully", data: customer });
    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

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
