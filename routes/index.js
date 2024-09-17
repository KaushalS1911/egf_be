const express = require('express');
const authRouter = require("../routes/auth")
const userRouter = require("../routes/user")
const branchRouter = require("../routes/branch")
const schemeRouter = require("../routes/scheme")
const inquiryRouter = require("../routes/inquiry")
const customerRouter = require("../routes/customer")
const caratRouter = require("../routes/carat")
const router = express.Router();


router.get('/', function (req, res, next) {
    res.render('index', {title: 'EGF'});
});

router.use('/auth', authRouter)
router.use('/company/:companyId/branch', branchRouter)
router.use('/company/:companyId/carat', caratRouter)
router.use('/company/:companyId/branch/:branchId/scheme', schemeRouter)
router.use('/company/:companyId/branch/:branchId/inquiry', inquiryRouter)
router.use('/company/:companyId/branch/:branchId/user', userRouter)
router.use('/company/:companyId/branch/:branchId/customer', customerRouter)

module.exports = router;
