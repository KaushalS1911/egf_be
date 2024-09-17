const UserModel = require("../models/user")
const {uploadFile} = require("../helpers/avatar");


async function getAllUsers(req, res) {
    try {
        const {companyId, branchId} = req.params;

        const users = await UserModel.find({
            company: companyId,
            branch: branchId,
            deleted_at: null
        }).populate([{path: "company"}, {path: "branch"}])

       return res.json({status: 200, data: users})

    } catch (err) {
        console.log(err)
       return res.json({status: 500, message: "Internal server error"})
    }
}

async function updateUserProfile(req, res) {
    try {
        const {companyId, branchId, userId} = req.params;

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
        const {companyId, branchId, userId} = req.params;

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
        const {companyId, branchId, userId} = req.params;

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

        const user = await UserModel.findById(id)

        return res.json({status: 200, data: user})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {getAllUsers, updateUserProfile,updateUser, getSingleUser, getUser}