require('dotenv').config()
const express = require('express');
const cron = require("node-cron")
const path = require('path');
const cookieParser = require('cookie-parser')
const logger = require('morgan');
const cors = require("cors");

const {updateOverdueLoans, updateOverdueOtherLoans, interestReminders} = require('./controllers/common')

const appRouter = require('./routes/index');
const mongoose = require("mongoose");
const moment = require('moment');
const port = process.env.PORT || 8000

const app = express();

app.set('trust proxy', true);

mongoose.connect(process.env.DB_CONNECTION_STRING)
    .then(() => {
        console.log('Database connected successfully');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });


app.use(logger('dev'));
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api',  appRouter);

const updateLoanStatus = async () => {
    try {
        await Promise.all([
            updateOverdueLoans(),
            updateOverdueOtherLoans()
        ]);
        console.log("Loan status updated successfully");
    } catch (error) {
        console.error("Error occurred during loan status update:", error);
    }
};

// Schedule the task to run every 5 minutes
cron.schedule('*/5 * * * *', updateLoanStatus);

cron.schedule('0 0 * * *', async () => {
    const today = moment();
    const lastDay = today.clone().endOf('month').date();

    // Check if today is one of the last 3 days of the month
    if ([lastDay - 1, lastDay - 2, lastDay].includes(today.date())) {
        try {
            await interestReminders();
            console.log("Reminders sent successfully on", today.format('YYYY-MM-DD'));
        } catch (error) {
            console.error("Error occurred during loan status update:", error);
        }
    } else {
        console.log("Not in last 3 days of the month:", today.format('YYYY-MM-DD'));
    }
});

app.listen(port, () => {
    console.log(`Server is running on PORT ${port}`)
})

