const CompanyModel = require("../models/company");
const UserModel = require("../models/user");
const EmployeeModel = require("../models/employee");
const { createHash, verifyHash } = require('../helpers/hash');
const { signLoginToken, signRefreshToken } = require("../helpers/jwt");

async function register(req, res) {
    try {
        const { firstName, middleName, lastName, email, contact, companyName, role, password } = req.body;

        const isCompanyExist = await CompanyModel.exists({ name: companyName, deleted_at: null });
        if (isCompanyExist) {
            return res.status(400).json({ status: 400, message: "Company already exists." });
        }

        const company = await CompanyModel.create({ name: companyName });

        const isUserExist = await UserModel.exists({ email, deleted_at: null });
        if (isUserExist) {
            await CompanyModel.findByIdAndDelete(company._id);
            return res.status(400).json({ status: 400, message: "User already exists." });
        }

        const encryptedPassword = await createHash(password);

        const user = await UserModel.create({
            company: company._id,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            role,
            password: encryptedPassword
        });

        return res.status(201).json({ status: 201, message: "Registered successfully", data: user });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function login(req, res) {
    try {
        const { password, email } = req.body;

        let user;

        user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found." });
        }

        const isMatch = await verifyHash(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ status: 400, message: "Invalid credentials." });
        }

        const tokens = await setTokens(user._id);

        user.other_info = tokens

        if(user.role !== 'Admin'){
            const emp = await EmployeeModel.findOne({user: user._id})
            user.branchId = emp.branchId
        }

        return res.status(200).json({ data: user, message: "Logged in successfully." });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

function getTokens(userId) {
    const jwt = signLoginToken(userId);
    const jwtRefresh = signRefreshToken(userId);
    return { jwt, jwtRefresh };
}

async function setTokens(userId) {
    const tokens = getTokens(userId);

    await UserModel.findByIdAndUpdate(userId, { other_info: tokens }, { new: true });

    return tokens;
}

module.exports = { register, login };
