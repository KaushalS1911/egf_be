const express = require('express');
const {sendWhatsAppNotification} = require( "../controllers/common");

const router = express.Router();

router.post('/',  sendWhatsAppNotification)

module.exports = router;