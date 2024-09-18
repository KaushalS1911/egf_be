const UserModel = require("../models/user")
const EmployeeModel = require("../models/employee")
const {uploadFile} = require("../helpers/avatar");


async function getAllUsers(req, res) {
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

        const users = await UserModel.find(query).populate([{path: "company"}])

       return res.json({status: 200, data: users})

    } catch (err) {
        console.log(err)
       return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateUserProfile(req, res) {
    try {
        const { userId} = req.params;

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const updatedUser = await UserModel.findByIdAndUpdate(userId, {avatar_url: avatar}, {new: true})

        return res.json({status: 200, data: updatedUser, message: "Profile pic updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateUser(req, res) {
    try {
        const {userId} = req.params;

        // const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer) : null;

        const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, {new: true})

        return res.json({status: 200, data: updatedUser, message: "User updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleUser(req, res) {
    try {
        const {userId} = req.params;

        const user = await UserModel.findById(userId)

        return res.json({status: 200, data: user})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getUser(req, res) {
    try {
        const {id} = req.user;

        let user;

        user = await UserModel.findById(id)

        if(user?.role !== 'Admin'){
            const emp = await EmployeeModel.findOne({user: user?._id})
            user.branchId = emp?.branchId
        }

        return res.json({status: 200, data: user})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {getAllUsers, updateUserProfile,updateUser, getSingleUser, getUser}