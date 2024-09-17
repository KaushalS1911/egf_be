const EmployeeModel = require("../models/employee")
const UserModel = require("../models/user")
const {uploadFile} = require("../helpers/avatar");
const {createHash, verifyHash} = require('../helpers/hash');

async function createEmployee(req, res) {
    try {
        const {companyId} = req.params

        const {
            branch,
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
            username,
            joiningDate,
            leaveDate,
            permanentAddress,
            temporaryAddress,
            bankDetails,
            status
        } = req.body

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;


        const isEmployeeExist = await EmployeeModel.exists({
            company: companyId,
            branch,
            deleted_at: null,
            $or: [
                {email: email},
                {username},
                {contact: contact}
            ]
        });

        if (isEmployeeExist) return res.json({status: 400, message: "Employee already exist."})

        const encryptedPassword = await createHash(password);

        const user = await UserModel.create({
            company: companyId,
            role,
            avatar_url: avatar,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            password: encryptedPassword
        })

        const employee = await EmployeeModel.create({
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
            username,
            joiningDate,
            leaveDate,
            status,
            permanentAddress,
            temporaryAddress,
            bankDetails
        })

        return res.json({status: 201, message: "Employee created successfully", data: {id: employee._id}})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllEmployees(req, res) {
    try {
        const {companyId} = req.params;

        const employees = await EmployeeModel.find({
            company: companyId,
            deleted_at: null
        }).populate([{path: "company"}, {path: "branch"}, {path: "user"}, {path: "reportingTo"}])

        return res.json({status: 200, data: employees})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateEmployee(req, res) {
    try {
        const {employeeId, companyId} = req.params;

        const {
            branch,
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
            username,
            joiningDate,
            leaveDate,
            permanentAddress,
            temporaryAddress,
            bankDetails,
            status
        } = req.body

        const isEmployeeExist = await EmployeeModel.exists({
            company: companyId,
            branch,
            deleted_at: null,
            $or: [
                {email: email},
                {username},
                {contact: contact}
            ]
        });

        if (isEmployeeExist) return res.json({status: 400, message: "Employee already exist."})

        const updatedEmp = await EmployeeModel.findByIdAndUpdate(employeeId, {
            branch,
            drivingLicense,
            panCard,
            aadharCard,
            voterCard,
            dob,
            remark,
            reportingTo,
            username,
            joiningDate,
            leaveDate,
            status,
            permanentAddress,
            temporaryAddress,
            bankDetails
        }, {new: true})

        const updatedUser = await UserModel.findByIdAndUpdate(updatedEmp.user,{
            role,
            firstName,
            middleName,
            lastName,
            email,
            contact,
        }, {new: true} )

        return res.json({status: 200, message: "Employee updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleEmployee(req, res) {
    try {
        const {employeeId} = req.params;

        const employee = await EmployeeModel.findById(employeeId).populate([{path: "company"}, {path: "branch"},{path: "user"}, {path: "reportingTo"}])

        return res.json({status: 200, data: employee})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleEmployees(req, res) {
    try {
        const {ids} = req.body;
        await EmployeeModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );
        return res.json({status: 200, message: "Deleted successfully"});
    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {
    createEmployee,
    getAllEmployees,
    updateEmployee,
    getSingleEmployee,
    deleteMultipleEmployees
}