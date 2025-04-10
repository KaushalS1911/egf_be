const UserModel = require("../models/user");
const { uploadFile } = require("../helpers/avatar");
const { verifyHash, createHash } = require("../helpers/hash");
const {uploadDir} = require("../constant");

async function getAllUsers(req, res) {
    const { companyId } = req.params;
    const { branch } = req.query;

    try {
        const query = {
            company: companyId,
            deleted_at: null,
        };

        if (branch) {
            query.branch = branch;
        }

        const users = await UserModel.find(query).populate("company");

        return res.status(200).json({ status: 200, data: users });
    } catch (err) {
        console.error("Error fetching users:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateUserProfile(req, res) {
    const { userId } = req.params;

    try {
        const user = await UserModel.findById(userId)

        const avatar = req.file && req.file.buffer ? await uploadFile(req.file.buffer, uploadDir.EMPLOYEES, `${user.firstName}_${user.lastName}`) : null;

        const updatedUser = await UserModel.findByIdAndUpdate(userId, { avatar_url: avatar }, { new: true });

        return res.status(200).json({ status: 200, data: updatedUser, message: "Profile picture updated successfully" });
    } catch (err) {
        console.error("Error updating user profile:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateUser(req, res) {
    const { userId } = req.params;

    try {
        const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, { new: true });

        return res.status(200).json({ status: 200, data: updatedUser, message: "User updated successfully" });
    } catch (err) {
        console.error("Error updating user:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleUser(req, res) {
    const { userId } = req.params;

    try {
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        return res.status(200).json({ status: 200, data: user });
    } catch (err) {
        console.error("Error fetching user:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updatePassword(req, res) {
    const { userId } = req.params;
    const { newPassword, currentPassword } = req.body;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        const isMatch = await verifyHash(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ status: 400, message: "Current password is incorrect" });
        }

        const encryptedPassword = await createHash(newPassword);
        await UserModel.findByIdAndUpdate(userId, { password: encryptedPassword }, { new: true });

        return res.status(200).json({ status: 200, message: "Password updated successfully" });
    } catch (err) {
        console.error("Error updating password:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { getAllUsers, updateUserProfile, updateUser, getSingleUser, updatePassword };
