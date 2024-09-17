const express = require('express');
const router = express.Router();
const { addInquiry, updateInquiry, getAllInquiries, deleteMultipleInquiries, getSingleInquiry} = require('../controllers/inquiry')

router.post('/', addInquiry);
router.get('/', getAllInquiries);
router.get('/:schemeId', getSingleInquiry);
router.put('/:schemeId', updateInquiry);
router.delete('/', deleteMultipleInquiries);

module.exports = router;
