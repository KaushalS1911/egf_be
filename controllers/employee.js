const mongoose = require('mongoose');
const EmployeeModel = require("../models/employee");
const UserModel = require("../models/user");
const { uploadFile } = require("../helpers/avatar");
const path = require("path");
const ejs = require("ejs");
const { sendMail } = require("../helpers/sendmail");
const { createHash } = require('../helpers/hash');

async function createEmployee(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { companyId } = req.params;
        const {branch} = req.query
        const {
            firstName,
            middleName,
            lastName,
            email,
            contact,
            password,
            dob,
            role,
            drivingLicense,
            panCard,
            aadharCard,
            voterCard,
            remark,
            reportingTo,
            joiningDate,
            permanentAddress,
            temporaryAddress,
            bankDetails,
            status
        } = req.body;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const isEmployeeExist = await EmployeeModel.exists({
            company: companyId,
            branch,
            deleted_at: null,
            $or: [{ email }, { contact }]
        });

        if (isEmployeeExist) {
            await session.abortTransaction();
            await session.endSession();
            return res.status(400).json({ status: 400, message: "Employee already exists." });
        }

        const encryptedPassword = await createHash(password);

        const user = new UserModel({
            company: companyId,
            role,
            avatar_url: avatar,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            password: encryptedPassword
        });

        await user.save({ session });

        const employee = new EmployeeModel({
            company: companyId,
            branch,
            user: user._id,
            drivingLicense,
            panCard,
            aadharCard,
            voterCard,
            dob,
            remark,
            reportingTo,
            joiningDate,
            status,
            permanentAddress,
            temporaryAddress,
            bankDetails
        });

        await employee.save({ session });

        const templatePath = path.join(__dirname, '../views/welcomeUser.ejs');
        const logoPath = path.join(__dirname, '../public/images/22.png');

        const htmlContent = await ejs.renderFile(templatePath, {
            name: `${firstName} ${lastName}`,
        });

        const mailPayload = {
            subject: "Welcome to EGF! Easy Gold Finance system",
            logo: logoPath,
            email
        };

        await sendMail(htmlContent, mailPayload);

        await session.commitTransaction();
        await session.endSession();

        return res.status(201).json({ status: 201, message: "Employee created successfully", data: { id: employee._id } });

    } catch (err) {
        await session.abortTransaction();
        await session.endSession();
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllEmployees(req, res) {
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

        const employees = await EmployeeModel.find(query)
            .populate("company")
            .populate("branch")
            .populate("user")
            .populate("reportingTo");

        // if (!employees || employees.length === 0) {
        //     return res.status(404).json({ status: 404, message: "No employees found" });
        // }

        return res.status(200).json({ status: 200, data: employees });
    } catch (err) {
        console.error("Error fetching employees:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateEmployee(req, res) {
    const { employeeId, companyId } = req.params;
    const {branch} = req.query;
    const {
        firstName,
        middleName,
        lastName,
        email,
        contact,
        dob,
        role,
        drivingLicense,
        panCard,
        aadharCard,
        voterCard,
        remark,
        reportingTo,
        joiningDate,
        leaveDate,
        permanentAddress,
        temporaryAddress,
        bankDetails,
        status
    } = req.body;

    try {
        const isEmployeeExist = await EmployeeModel.exists({
            company: companyId,
            branch,
            deleted_at: null,
            $or: [{ email }, { contact }],
            _id: { $ne: employeeId }
        });

        if (isEmployeeExist) {
            return res.status(400).json({ status: 400, message: "Employee already exists." });
        }

        const updatedEmp = await EmployeeModel.findByIdAndUpdate(
            employeeId,
            {
                branch,
                drivingLicense,
                panCard,
                aadharCard,
                voterCard,
                dob,
                remark,
                reportingTo,
                joiningDate,
                leaveDate,
                status,
                permanentAddress,
                temporaryAddress,
                bankDetails
            },
            { new: true }
        );

        if (!updatedEmp) {
            return res.status(404).json({ status: 404, message: "Employee not found." });
        }

        await UserModel.findByIdAndUpdate(
            updatedEmp.user,
            {
                role,
                firstName,
                middleName,
                lastName,
                email,
                contact
            },
            { new: true }
        );

        return res.status(200).json({ status: 200, message: "Employee updated successfully" });
    } catch (err) {
        console.error("Error updating employee:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleEmployee(req, res) {
    const { employeeId } = req.params;

    try {
        const employee = await EmployeeModel.findById(employeeId)
            .populate("company")
            .populate("branch")
            .populate("user")
            .populate("reportingTo");

        if (!employee) {
            return res.status(404).json({ status: 404, message: "Employee not found" });
        }

        return res.status(200).json({ status: 200, data: employee });
    } catch (err) {
        console.error("Error fetching employee:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleEmployees(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "Invalid employee IDs." });
        }

        await EmployeeModel.updateMany(
            { user: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        await UserModel.updateMany(
        { _id: { $in: ids } },
        { $set: { deleted_at: new Date() }
        })

        return res.status(200).json({ status: 200, message: "Employees deleted successfully." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = {
    createEmployee,
    getAllEmployees,
    updateEmployee,
    getSingleEmployee,
    deleteMultipleEmployees
};
