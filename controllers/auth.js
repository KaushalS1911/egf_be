const CompanyModel = require("../models/company");
const UserModel = require("../models/user");
const BranchModel = require("../models/branch");
const EmployeeModel = require("../models/employee");
const ConfigModel = require("../models/config");
const mongoose = require('mongoose')
const path = require("path")
const os = require("os");
const ejs = require("ejs")
const jwt = require("jsonwebtoken");
const {createHash, verifyHash} = require('../helpers/hash');
const {signLoginToken, signRefreshToken} = require("../helpers/jwt");
const {sendMail} = require('../helpers/sendmail')
const twilio = require("twilio"); // Or, for ESM: import twilio from "twilio";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


async function register(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {firstName, middleName, lastName, email, contact, companyName, role, password} = req.body;

        const isCompanyExist = await CompanyModel.exists({name: companyName, deleted_at: null});
        if (isCompanyExist) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({status: 400, message: "Company already exists."});
        }

        const company = new CompanyModel({name: companyName});
        await company.save({session});

        const isUserExist = await UserModel.exists({email, deleted_at: null});
        if (isUserExist) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({status: 400, message: "User already exists."});
        }

        const encryptedPassword = await createHash(password);

        const user = new UserModel({
            company: company._id,
            firstName,
            middleName,
            lastName,
            email,
            contact,
            role,
            password: encryptedPassword
        });
        await user.save({session});

        await setConfigs(company._id, {session});

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({status: 201, message: "Registered successfully", data: user});

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function login(req, res) {
    try {
        const mac = os.networkInterfaces()?.Ethernet?.filter(e => e?.family === 'IPv4')[0].mac.toUpperCase()

        const {otp, contact} = req.body;

        const user = await UserModel.findOne({contact}).lean();

        if (user.role !== 'Admin') {
            const configs = await ConfigModel.findOne({company: user?.company})

            const [configDevices] = configs?.devices?.filter((e) => e?.employee?.userId)

            if(!configDevices) {
                return res.json({status: 400, message: "Access denied."});
            }

            if (configDevices?.macAddress !== mac) {
                return res.status(403).json({ message: 'Device not authorized' });
            }

            const emp = await EmployeeModel.findOne({user: user._id, deleted_at: null});

            if(emp.status !== "Active") {
                return res.json({status: 400, message: "Employee status is inactive or blocked."});
            }

            user.employeeId = emp?._id;
        }

        if (user && user?.branch) {
            const userBranch = await BranchModel.findById(user?.branch)
            user.branch = userBranch
        }

        if (!user) {
            return res.status(404).json({status: 404, message: "User not found."});
        }

        const isMatch = user?.otp === otp;

        if (!isMatch) {
            return res.status(400).json({status: 400, message: "Invalid credentials."});
        }

        const tokens = await setTokens(user._id);

        return res.status(200).json({data: {...user, tokens}, message: "Logged in successfully."});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function sendOtp(req, res) {
    try{
        const {contact} = req.body
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 5 * 60 * 1000;

        await createMessage(otp, contact);

        await UserModel.findOneAndUpdate({contact}, {otp, otpExpiry}, {new: true})

        return res.status(200).json({
            status: 200,
            message: "Otp sent successfully"
        })
    }catch (error){
        console.log(error)
        return res.status(500).json({status: 500, message: error?.message});
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

        const resetLink = `http://localhost:3030/jwt/reset-password/${token}`;
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

        await sendMail(htmlContent, mailPayload)

        return res.status(200).json({message: 'Password reset link sent to your email.'});
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: 'Server error.'});
    }
}

async function resetPassword(req, res) {
    const {token} = req.params;
    const {newPassword} = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(400).json({message: 'Invalid token or user does not exist.'});
        }

        const encryptedPassword = await createHash(newPassword);

        user.password = encryptedPassword;
        await user.save();

        res.json({message: 'Password reset successfully.'});
    } catch (error) {
        res.status(500).json({message: 'Server error or token expired.'});
    }
}

async function getUser(req, res) {
    try {
        const {id} = req.user;

        const user = await UserModel.findById(id).populate('branch');
        if (!user) {
            return res.status(404).json({status: 404, message: "User not found"});
        }

        if (user?.role !== 'Admin') {
            const emp = await EmployeeModel.findOne({user: user?._id});
            user.employeeId = emp?._id;
        }

        return res.status(200).json({
            status: 200,
            data: user
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({status: 500, message: "Internal server error"});
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
        loanTypes: [],
        businessType: [],
        remarks: [],
        exportPolicyConfig: [],
        months: [],
        otherNames: [],
        whatsappConfig: {},
    });

    await configs.save();
}


async function createMessage(otp, to) {
    await client.messages.create({
        body: `Your OTP for login in the Easy Gold Fincorp admin panel is ${otp}. Please do not share this code with anyone. It will expire in 5 minutes.`,
        from: "+18482929116",
        to: `+91${to}`,
    });
}


module.exports = {register, login, forgotPassword, getUser, resetPassword, sendOtp};
