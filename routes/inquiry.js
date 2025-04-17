const express = require('express');
const multer = require("multer");
const router = express.Router();
const { addInquiry, updateInquiry, getAllInquiries, deleteMultipleInquiries, getSingleInquiry,addBulkInquiries} = require('../controllers/inquiry')
const macWhitelistMiddleware = require("../middlewares/whitelist");
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/inquiry', addInquiry);
router.post('/:companyId/bulk-inquiry', upload.single('inquiry-file'), addBulkInquiries);
router.get('/:companyId/inquiry' ,getAllInquiries);
router.get('/:companyId/inquiry/:inquiryId', getSingleInquiry);
router.put('/:companyId/inquiry/:inquiryId', updateInquiry);
router.delete('/:companyId/inquiry', deleteMultipleInquiries);

module.exports = router;
