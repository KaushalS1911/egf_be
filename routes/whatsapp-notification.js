const express = require('express');
const {sendWhatsAppNotification} = require( "../controllers/common");
const multer = require("multer");

const router = express.Router();
const upload = multer();

router.post('/',  upload.single("file"), sendWhatsAppNotification)

module.exports = router;