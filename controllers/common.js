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

async function updateOverdueOtherLoans() {
    const today = new Date();

    try {
        await OtherIssuedLoanModel.bulkWrite([
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        renewalDate: {$gt: today},
                        status: {$nin: ["Closed"]}
                    },
                    update: {$set: {status: 'Overdue'}}
                }
            },
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        renewalDate: {$lt: today},
                        status: {$nin: ['Closed']}
                    },
                    update: {$set: {status: 'Regular'}}
                }
            }
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
                        status: {$nin: ["Closed", "Issued"]}
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
                        status: {$nin: ['Closed', 'Issued']}
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
        const payload = req.body
        const file = req.file || null
        await sendMessage(payload, file)

        res.status(200).json({
            success: true,
            message: "WhatsApp notification sent successfully",
        });
    } catch (error) {
        console.error("Error sending WhatsApp notification:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to send WhatsApp notification",
            error: error.response ? error.response.data : error.message,
        });
    }
}

async function sendMessage(messagePayload, file = null){
    {
        const { type, contact, ...payload } = messagePayload;
        const scenarioFunction = scenarios[type];

        if (!scenarioFunction) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification type",
            });
        }

        const formData = new FormData();

        const safeContact = contact ? `91${contact}` : '';
        const safeName = [
            payload.firstName,
            payload.middleName,
            payload.lastName
        ].filter(Boolean).join(' ');

        formData.append("authToken", process.env.WHATSAPP_API_AUTH_TOKEN);
        formData.append("name", safeName);
        formData.append("sendto", safeContact);
        formData.append("originWebsite", process.env.WHATSAPP_API_ORIGIN_WEBSITE);
        formData.append("templateName", type);
        formData.append("language", process.env.WHATSAPP_API_TEMPLATE_LANGUAGE);

        if (file) {
            formData.append("myfile", file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
        }

        const customData = scenarioFunction(payload, file);

        customData.forEach((value, index) => {
            const safeValue = value != null ? String(value) : '';
            formData.append(`data[${index}]`, safeValue);
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

        await axios(config);
    }
}

const scenarios = {
    loan_detail: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNo,
        payload.loanAmount,
        payload.interestRate,
        payload.consultingCharge,
        moment(payload.issueDate).format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    sanction_letter_11: (payload, file) => [],
    loan_issue: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNo,
        payload.loanAmount,
        payload.interestRate,
        payload.consultingCharge,
        moment(payload.issueDate).format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    reminder: (payload) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.loanNumber,
        payload.loanAmount,
        payload.interestAmount,
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
    ],
    interest_payment: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.interestAmount,
        moment().format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
    ],
    uchak_interest_payment: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        moment().format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
    ],
    part_release: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        payload.interestLoanAmount,
        moment(payload.createdAt).format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    part_payment: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        moment(payload.createdAt).format("DD/MM/YYYY"),
        payload.interestLoanAmount,
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    loan_close: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.loanAmount,
        moment(payload.date).format("DD/MM/YYYY"),
        payload.closingCharge,
        payload.amountPaid,
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
};


module.exports = {sendBirthdayNotification, updateOverdueLoans, updateOverdueOtherLoans, sendWhatsAppMessage, sendWhatsAppNotification, sendMessage}
