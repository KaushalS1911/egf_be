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
const router = express.Router();


router.get('/', function (req, res, next) {
    res.render('index', {title: 'EGF'});
});

router.use('/auth', authRouter)
router.use('/company', branchRouter)
router.use('/company', schemeRouter)
router.use('/company', inquiryRouter)
router.use('/company', branchRouter)
router.use('/company', userRouter)
router.use('/company', customerRouter)
router.use('/company', caratRouter)
router.use('/company', loanRouter)
router.use('/company', propertyRouter)
router.use('/company', penaltyRouter)
router.use('/company', employeeRouter)
router.use('/company', configRouter)

module.exports = router;
