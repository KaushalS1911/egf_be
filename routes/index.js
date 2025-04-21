const express = require('express');
const authRouter = require("../routes/auth")
const branchRouter = require("../routes/branch")
const userRouter = require("../routes/user")
const schemeRouter = require("../routes/scheme")
const inquiryRouter = require("../routes/inquiry")
const customerRouter = require("../routes/customer")
const caratRouter = require("../routes/carat")
const loanRouter = require("./loan_type")
const propertyRouter = require("../routes/property")
const penaltyRouter = require("../routes/penalty")
const employeeRouter = require("../routes/employee")
const configRouter = require("../routes/config")
const companyRouter = require("../routes/company")
const issueLoanRouter = require("../routes/issue-loan")
const otherIssuedLoanRouter = require("../routes/other-issued-loan")
const reminderRouter = require("../routes/reminder")
const commonRouter = require("../routes/common")
const reportRouter = require("../routes/reports")
const verificationRouter = require("../routes/verification")
const whatsappNotificationRouter = require("../routes/whatsapp-notification")
const analyticsRouter = require("../routes/analytics")
const expenseRouter = require("../routes/expense")
const otherIncomeRouter = require("../routes/other-income")

const router = express.Router();
const auth = require("../middlewares/auth");

router.get('/', function (req, res, next) {
    res.render('index', {title: 'EGF'});
});

router.use('/auth', authRouter)
router.use('/company', auth, companyRouter)
router.use('/company', auth, branchRouter)
router.use('/company', auth, schemeRouter)
router.use('/company', auth, inquiryRouter)
router.use('/company', auth, branchRouter)
router.use('/company', auth, userRouter)
router.use('/company', auth, customerRouter)
router.use('/company', auth, caratRouter)
router.use('/company', auth, loanRouter)
router.use('/company', auth, propertyRouter)
router.use('/company', auth, penaltyRouter)
router.use('/company', auth, employeeRouter)
router.use('/company', auth, configRouter)
router.use('/company', auth, reminderRouter)
router.use('/company', auth, commonRouter)
router.use('/company', auth, reportRouter)
router.use('/verification', verificationRouter)
router.use('/whatsapp-notification', whatsappNotificationRouter)
router.use('/company', auth, analyticsRouter)
router.use('/company', auth, expenseRouter)
router.use('/company', auth, otherIncomeRouter)

// loans
router.use('/company', auth, issueLoanRouter)
router.use('/company', auth, otherIssuedLoanRouter)

module.exports = router;
