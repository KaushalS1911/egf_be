const moment = require('moment');
const CustomerModel = require("../models/customer")
const IssuedLoanModel = require("../models/issued-loan")

async function sendBirthdayNotification(req, res) {
    try {
        const today = moment().format('MM-DD');

        const customers = await CustomerModel.find({
            dob: {
                $exists: true,
                $ne: null,
                $expr: {
                    $eq: [{ $substr: ["$dob", 5, 5] }, today]
                }
            }
        });

        if (customers.length > 0) {
            customers.forEach(async (customer) => {
                await sendNotification(customer.email, "Happy Birthday!", "Wishing you a wonderful birthday!");
                console.log(`Birthday notification sent to ${customer.name}`);
            });

            res.status(200).json({ message: `${customers.length} birthday wishes sent!` });
        } else {
            res.status(200).json({ message: "No birthdays today!" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending birthday notifications" });
    }
}

async function sendNotification(email, subject, message) {
    console.log(`Notification sent to ${email} with subject: ${subject}`);
}

async function updateOverdueLoans(){
    try {
        const today = new Date();

        await IssuedLoanModel.bulkWrite([
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        nextInstallmentDate: { $lt: today },
                        status: { $ne: 'Closed' }
                    },
                    update: { $set: { status: 'Overdue' } }
                }
            },
            {
                updateMany: {
                    filter: {
                        deleted_at: null,
                        nextInstallmentDate: { $gte: today },
                        lastInstallmentDate: { $ne: null },
                        status: { $ne: 'Closed' }
                    },
                    update: { $set: { status: 'Regular' } }
                }
            }
        ]);
    } catch (error) {
        console.error(error);
    }
}

module.exports = {sendBirthdayNotification, updateOverdueLoans}
