const moment = require('moment');
const CustomerModel = require("../models/customer")
const IssuedLoanModel = require("../models/issued-loan")
const OtherIssuedLoanModel = require("../models/other-issued-loan")
const req = require("express/lib/request");
const axios = require("axios");

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

module.exports = {sendBirthdayNotification, updateOverdueLoans, updateOverdueClosedLoans, sendWhatsAppMessage}
