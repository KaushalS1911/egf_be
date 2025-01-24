const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth')
const { register, login, forgotPassword, getUser,resetPassword, sendOtp} = require('../controllers/auth')

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.get('/me', auth ,getUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);


module.exports = router;
