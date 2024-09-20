const CompanyModel = require("../models/company");
const UserModel = require("../models/user");
const EmployeeModel = require("../models/employee");
const ConfigModel = require("../models/config");
const path = require("path")
const ejs = require("ejs")
const jwt = require("jsonwebtoken");
const {createHash, verifyHash} = require('../helpers/hash');
const {signLoginToken, signRefreshToken} = require("../helpers/jwt");
const {sendMail} = require('../helpers/sendmail')



async function register(req, res) {
    try {
        const {firstName, middleName, lastName, email, contact, companyName, role, password} = req.body;

        const isCompanyExist = await CompanyModel.exists({name: companyName, deleted_at: null});
        if (isCompanyExist) {
            return res.status(400).json({status: 400, message: "Company already exists."});
        }
        const company = await CompanyModel.create({name: companyName});

        const isUserExist = await UserModel.exists({email, deleted_at: null});
        if (isUserExist) {
            return res.status(400).json({status: 400, message: "User already exists."});
        }

        const encryptedPassword = await createHash(password);
        const user = await UserModel.create({
            company: company?._id,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            role,
            password: encryptedPassword
        });

        await setConfigs(company?._id);

        return res.status(201).json({status: 201, message: "Registered successfully", data: user});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function login(req, res) {
    try {
        const {password, email} = req.body;

        const user = await UserModel.findOne({email});
        if (!user) {
            return res.status(404).json({status: 404, message: "User not found."});
        }

        const isMatch = await verifyHash(password, user.password);
        if (!isMatch) {
            return res.status(400).json({status: 400, message: "Invalid credentials."});
        }

        const tokens = await setTokens(user.id);

        if (user.role !== 'Admin') {
            const emp = await EmployeeModel.findOne({user: user._id});
            user.branch = emp?.branch;
        }

        return res.status(200).json({data: {...user.toObject(), tokens}, message: "Logged in successfully."});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function forgotPassword(req, res) {
    const {email} = req.body;
    try {
        const user = await UserModel.findOne({email});

        if (!user) {
            return res.status(400).json({message: 'User with this email does not exist.'});
        }

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        const resetLink = `https://egf-be.onrender.com/reset-password/${token}`;
        const templatePath = path.join(__dirname, '../views/resetPasswordEmail.ejs');
        const logoPath = path.join(__dirname, '../public/images/22.png');

        const htmlContent = await ejs.renderFile(templatePath, {
            resetLink,
        });

        const mailPayload = {
            subject: "Forgot Password",
            logo: logoPath,
            email: user.email
        }

        await sendMail(htmlContent,mailPayload)

        return res.json({message: 'Password reset link sent to your email.'});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: 'Server error.'});
    }
}

async function resetPassword(req,res){
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(400).json({ message: 'Invalid token or user does not exist.' });
        }

        const encryptedPassword = await createHash(newPassword);

        user.password = encryptedPassword;
        await user.save();

        res.json({ message: 'Password reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error or token expired.' });
    }
}

async function getUser(req, res) {
    try {
        const { id } = req.user;

        const user = await UserModel.findById(id).lean();
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" });
        }

        user.branch = null;

        if (user.role !== 'Admin') {
            const emp = await EmployeeModel.findOne({ user: user._id });
            if (emp) {
                user.branch = emp.branch || null;
            }
        }

        return res.status(200).json({ status: 200, data: user });

    } catch (err) {
        console.error("Error fetching user:", err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function setTokens(userId) {
    const tokens = {
        jwt: signLoginToken(userId),
        jwtRefresh: signRefreshToken(userId)
    };

    await UserModel.findByIdAndUpdate(userId, {other_info: tokens}, {new: true});
    return tokens;
}


const setConfigs = async (companyId) => {

    const configs = new ConfigModel({
        company: companyId,
        roles: ["Admin", "Employee"],
        goldRate: 6600,
        businessType: [],
        permissions: {
            'Employee': {
                sections: ['inquiry', 'customer', 'scheme', 'carat', 'employee', "loan_type", "penalty", "property", "loan_issue", "loan_disburse", "loan_pay"],
                responsibilities: {

                    // customer
                    'create_customer': true,
                    'read_customer': true,
                    'update_customer': true,
                    'delete_customer': true,

                    // inquiry
                    'create_inquiry': true,
                    'read_inquiry': true,
                    'update_inquiry': true,
                    'delete_inquiry': true,

                    // scheme
                    'create_scheme': true,
                    'read_scheme': true,
                    'update_scheme': true,
                    'delete_scheme': true,

                    // carat
                    'create_carat': true,
                    'read_carat': true,
                    'update_carat': true,
                    'delete_carat': true,

                    // employee
                    'create_employee': true,
                    'read_employee': true,
                    'update_employee': true,
                    'delete_employee': true,

                    // loan_type
                    'create_loan_type': true,
                    'read_loan_type': true,
                    'update_loan_type': true,
                    'delete_loan_type': true,

                    // penalty
                    'create_penalty': true,
                    'read_penalty': true,
                    'update_penalty': true,
                    'delete_penalty': true,

                    // property
                    'create_property': true,
                    'read_property': true,
                    'update_property': true,
                    'delete_property': true,

                    // loan_issue
                    'create_loan_issue': true,
                    'read_loan_issue': true,
                    'update_loan_issue': true,
                    'delete_loan_issue': true,


                    // loan_disburse
                    'create_loan_disburse': true,
                    'read_loan_disburse': true,
                    'update_loan_disburse': true,
                    'delete_loan_disburse': true,


                    // loan_pay
                    'create_loan_pay': true,
                    'read_loan_pay': true,
                    'update_loan_pay': true,
                    'delete_loan_pay': true,

                },
            },
        }
    });

    await configs.save();
}

module.exports = {register, login, forgotPassword, getUser,resetPassword};
