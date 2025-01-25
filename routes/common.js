const express = require('express');
const router = express.Router();
const { sendBirthdayNotification} = require('../controllers/common')

router.put('/:companyId/send-wishes', sendBirthdayNotification);

module.exports = router;
