const moment = require('moment');
const CustomerModel = require("../models/customer")
const IssuedLoanModel = require("../models/issued-loan")
const OtherIssuedLoanModel = require("../models/other-issued-loan")
const InterestModel = require("../models/interest")
const UchakInterestModel = require("../models/uchak-interest-payment")
const ConfigModel = require("../models/config");
const axios = require("axios");
const FormData = require("form-data");
const PartPaymentModel = require("../models/loan-part-payment");
const LoanPartReleaseModel = require("../models/part-release");
const PenaltyModel = require("../models/penalty");

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
                    update: {$set: {status: 'Regular'}}
                }
            },
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        renewalDate: {$lt: today},
                        status: {$nin: ['Closed']}
                    },
                    update: {$set: {status: 'Overdue'}}
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


async function interestReminders() {
    try {
        const today = moment().startOf('day');
        const fromDate = moment().add(3, 'days').startOf('day');

        const loans = await IssuedLoanModel.find({
            nextInstallmentDate: { $gte: today.toDate(), $lt: fromDate.toDate() },
            status: { $nin: ["Closed",'Issued'] },
            deleted_at: null,
        }).populate([
            { path: "customer", populate: "branch" },
            { path: "company" },
            { path: "scheme" }
        ]);

        const reminders = loans.map(async (loan) => {
            const [interests] = await Promise.all([
                InterestModel.find({ loan: loan._id }).sort({ createdAt: -1 }),
            ]);

            let uchakInterest = 0;
            if (interests.length > 0) {
                const lastInterest = interests[0];
                const uchakInterestData = await UchakInterestModel.aggregate([
                    { $match: { loan: loan._id, date: { $gte: lastInterest.createdAt } } },
                    { $group: { _id: null, totalInterest: { $sum: "$amountPaid" } } }
                ]);
                uchakInterest = uchakInterestData.length > 0 ? uchakInterestData[0].totalInterest : 0;
            }

            const lastInstallmentDate = loan.lastInstallmentDate ? moment(loan.lastInstallmentDate).startOf('day') : moment(loan.issueDate).startOf('day');
            const daysDiff = today.diff(lastInstallmentDate, 'days');
            const penaltyDayDiff = today.diff(moment(interests.length ? loan.lastInstallmentDate : loan.nextInstallmentDate), 'days');

            const interestRate = loan.scheme?.interestRate ?? 0;
            const interestAmount = ((loan.interestLoanAmount * (interestRate / 100)) * 12 * daysDiff) / 365;
            const oldCrDr = interests.length ? interests[0].cr_dr ?? 0 : 0;

            let pendingInterest = interestAmount - uchakInterest + oldCrDr;
            let penaltyAmount = 0;

            const penaltyData = await PenaltyModel.findOne({
                company: loan.company._id,
                afterDueDateFromDate: { $lte: penaltyDayDiff },
                afterDueDateToDate: { $gte: penaltyDayDiff },
            }).select('penaltyInterest');

            if (penaltyData) {
                const penaltyInterestRate = penaltyData.penaltyInterest;
                penaltyAmount = ((loan.interestLoanAmount * (penaltyInterestRate / 100)) * 12 * daysDiff) / 365;
            }

            pendingInterest += penaltyAmount;

            const payload = {
                type: 'reminder',
                firstName: loan.customer.firstName,
                middleName: loan.customer.middleName,
                lastName: loan.customer.lastName,
                contact: loan.customer.contact,
                loanNumber: loan.loanNo,
                loanAmount: loan.loanAmount,
                interestAmount: pendingInterest,
                nextInstallmentDate: moment(loan.nextInstallmentDate, 'DD-MM-YYYY').format(),
                branchContact: loan.customer.branch.contact,
                companyContact: loan.company.contact,
                companyEmail: loan.company.email,
                companyName: loan.company.name,
            };
            await sendMessage(payload);
        });

        await Promise.all(reminders);
        console.log("Reminders sent successfully.");

    } catch (error) {
        console.error("Error sending interest reminders:", error);
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

async function sendMessage(messagePayload, file = null) {
    try {
        const { type, contact, company, ...payload } = messagePayload;
        const scenarioFunction = scenarios[type];

        if (!scenarioFunction) {
            return {
                success: false,
                message: "Invalid notification type",
            };
        }

        // Fetch WhatsApp configuration
        const config = await ConfigModel.findOne({ company }).select("whatsappConfig");
        console.log("Fetched Config:", config);

        // Collect valid contacts
        const contacts = [contact, config?.whatsappConfig?.contact1, config?.whatsappConfig?.contact2].filter(Boolean);
        console.log("Contacts to send:", contacts);

        if (contacts.length === 0) {
            console.warn("No valid contacts found.");
            return {
                success: false,
                message: "No valid contacts found",
            };
        }

        // Function to send message
        const sendRequest = async (contact) => {
            try {
                console.log(`Sending message to: 91${contact}`);

                const formData = new FormData();
                formData.append("authToken", process.env.WHATSAPP_API_AUTH_TOKEN);
                formData.append("name", [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(" "));
                formData.append("sendto", `91${contact}`);
                formData.append("originWebsite", process.env.WHATSAPP_API_ORIGIN_WEBSITE);
                formData.append("templateName", type);
                formData.append("language", process.env.WHATSAPP_API_TEMPLATE_LANGUAGE);

                // Handling file attachments
                if (file && file.buffer) {
                    formData.append("myfile", file.buffer, {
                        filename: file.originalname,
                        contentType: file.mimetype,
                    });
                    console.log(`File attached: ${file.originalname}`);
                }

                // Adding template variables
                const scenarioData = scenarioFunction(payload, file);
                console.log("Scenario Data:", scenarioData);

                scenarioData.forEach((value, index) => {
                    formData.append(`data[${index}]`, value != null ? String(value) : "");
                });

                // Send request to WhatsApp API
                const response = await axios({
                    method: "post",
                    maxBodyLength: Infinity,
                    url: "https://app.11za.in/apis/template/sendTemplate",
                    headers: { ...formData.getHeaders() },
                    data: formData,
                });

                console.log(`Message sent successfully to ${contact}:`, response.data);
                return response.data;
            } catch (error) {
                console.error(`Error sending message to ${contact}:`, error.response?.data || error.message);
                return { success: false, error: error.response?.data || error.message };
            }
        };

        // Send messages to all contacts
        const results = await Promise.all(contacts.map(sendRequest));

        return { success: true, results };
    } catch (error) {
        console.error("Unexpected error in sendMessage:", error);
        return { success: false, message: "Internal server error", error: error.message };
    }
}

const scenarios = {
    loan_details: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNo,
        payload.loanAmount,
        payload.interestRate,
        payload.consultingCharge,
        moment(payload.issueDate).format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.branchContact,
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
        payload.branchContact,
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
        payload.branchContact,
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
        payload.branchContact,
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    uchak_interest: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        moment().format("DD/MM/YYYY"),
        payload.branchContact,
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
    part_release: (payload, file) => [
        `${payload.firstName} ${payload.middleName} ${payload.lastName}`,
        payload.loanNumber,
        payload.amountPaid,
        payload.interestLoanAmount,
        moment(payload.createdAt).format("DD/MM/YYYY"),
        moment(payload.nextInstallmentDate).format("DD/MM/YYYY"),
        payload.branchContact,
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
        payload.branchContact,
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
        payload.branchContact,
        payload.companyContact,
        payload.companyEmail,
        payload.companyName,
        payload.companyName,
    ],
};


module.exports = {
    sendBirthdayNotification,
    updateOverdueLoans,
    updateOverdueOtherLoans,
    sendWhatsAppMessage,
    sendWhatsAppNotification,
    sendMessage,
    interestReminders
}
