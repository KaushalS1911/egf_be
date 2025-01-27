const moment = require('moment');
const CustomerModel = require("../models/customer")
const IssuedLoanModel = require("../models/issued-loan")
const OtherIssuedLoanModel = require("../models/other-issued-loan")
const axios = require("axios");
const FormData = require("form-data");

async function sendBirthdayNotification(req, res) {
    try {
        const today = moment().format('MM-DD');

        const customers = await CustomerModel.find({
            dob: {
                $exists: true,
                $ne: null,
                $expr: {
                    $eq: [{$substr: ["$dob", 5, 5]}, today]
                }
            }
        });

        if (customers.length > 0) {
            customers.forEach(async (customer) => {
                await sendNotification(customer.email, "Happy Birthday!", "Wishing you a wonderful birthday!");
                console.log(`Birthday notification sent to ${customer.name}`);
            });

            res.status(200).json({message: `${customers.length} birthday wishes sent!`});
        } else {
            res.status(200).json({message: "No birthdays today!"});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Error sending birthday notifications"});
    }
}

async function sendNotification(email, subject, message) {
    console.log(`Notification sent to ${email} with subject: ${subject}`);
}

async function updateOverdueClosedLoans() {
    const today = new Date();

    try {
        await OtherIssuedLoanModel.bulkWrite([
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        renewalDate: {$lt: new Date(today.setDate(today.getDate() - 5))},
                        status: {$eq: 'Issued'}
                    },
                    update: {$set: {status: 'Overdue'}}
                }
            },
        ]);
    } catch (error) {
        console.error(error);
    }
}


async function updateOverdueLoans() {
    try {
        const today = new Date();

        await IssuedLoanModel.bulkWrite([
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        nextInstallmentDate: {$lt: today},
                        status: {$ne: 'Closed'}
                    },
                    update: {$set: {status: 'Overdue'}}
                }
            },
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        nextInstallmentDate: {$gte: today},
                        lastInstallmentDate: {$ne: null},
                        status: {$ne: 'Closed'}
                    },
                    update: {$set: {status: 'Regular'}}
                }
            }
        ]);
    } catch (error) {
        console.error(error);
    }
}

async function sendWhatsAppMessage(formData) {
    try {
        await axios.post(process.env.WHATSAPP_API_URL, formData);
    } catch (error) {
        console.log(error);
        throw error
    }
}

async function sendWhatsAppNotification(req, res) {
    try {
        const { type, ...payload } = req.body;
        const scenarioFunction = scenarios[type];

        if (!scenarioFunction) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification type",
            });
        }

        const file = req.file;
        const formData = new FormData();

        // Common fields
        formData.append("authToken", process.env.WHATSAPP_API_AUTH_TOKEN);
        formData.append("name", `${payload.firstName} ${payload.lastName}`);
        formData.append("sendto", `91${payload.contact}`);
        formData.append("originWebsite", process.env.WHATSAPP_API_ORIGIN_WEBSITE);
        formData.append("templateName", type);
        formData.append("language", process.env.WHATSAPP_API_TEMPLATE_LANGUAGE);

        // Optional file attachment
        if (file) {
            formData.append("myfile", file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
        }

        // Generate custom data and append it
        const customData = scenarioFunction(payload, file);
        customData.forEach((value, index) => {
            console.log(value, index);
            formData.append(`data[${index}]`, value);
        });

        const config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://app.11za.in/apis/template/sendTemplate",
            headers: {
                ...formData.getHeaders(),
            },
            data: formData,
        };

        // Send request
        const response = await axios(config);

        // Send success response to the client
        res.status(200).json({
            success: true,
            message: "WhatsApp notification sent successfully",
            data: response.data,
        });
    } catch (error) {
        console.error("Error sending WhatsApp notification:", error.message);

        // Send error response to the client
        res.status(500).json({
            success: false,
            message: "Failed to send WhatsApp notification",
            error: error.response ? error.response.data : error.message,
        });
    }
}


const scenarios = {
    issue_loan: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNo,
        payload.loanAmount,
        payload.interestRate,
        payload.consultingCharge,
        new Date(payload.issueDate).toISOString(),
        new Date(payload.nextInstallmentDate).toISOString(),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
    ],
    reminder: (payload) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.loanNumber,
        payload.loanAmount,
        payload.interestAmount,
        new Date(payload.nextInstallmentDate).toISOString(),
        payload.company.contact,
        payload.company.email,
        payload.company.name,
    ],
    interest_payment: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.interestAmount,
        new Date().toISOString(),
        new Date(payload.nextInstallmentDate).toISOString(),
        payload.company.contact,
        payload.company.email,
        payload.company.name,
    ],
    uchak_interest_payment: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        new Date().toISOString(),
        payload.company.contact,
        payload.company.email,
        payload.company.name,
    ],
    part_release: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        payload.interestLoanAmount,
        new Date(payload.createdAt).toISOString(),
        new Date(payload.nextInstallmentDate).toISOString(),
        payload.company.contact,
        payload.company.email,
        payload.company.name,
        payload.company.name,
    ],
    part_payment: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        new Date(payload.createdAt).toISOString(),
        payload.interestLoanAmount,
        new Date(payload.nextInstallmentDate).toISOString(),
        payload.company.contact,
        payload.company.email,
        payload.company.name,
        payload.company.name,
    ],
    loan_close: (payload, file) => [
        `${payload.firstName} ${payload.lastName}`,
        payload.loanNumber,
        payload.loanAmount,
        new Date(payload.date).toISOString(),
        payload.closingCharge,
        payload.amountPaid,
        payload.company.contact,
        payload.company.email,
        payload.company.name,
        payload.company.name,
    ],
};


module.exports = {sendBirthdayNotification, updateOverdueLoans, updateOverdueClosedLoans, sendWhatsAppMessage, sendWhatsAppNotification}
