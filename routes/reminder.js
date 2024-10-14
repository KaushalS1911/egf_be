const express = require('express');
const router = express.Router();
const { addReminder, getAllReminders, updateReminder, getSingleReminder,deleteMultipleReminders } = require('../controllers/reminder')

router.post('/:companyId/reminder', addReminder);
router.get('/:companyId/reminder', getAllReminders);
router.get('/:companyId/reminder/:reminderId', getSingleReminder);
router.put('/:companyId/reminder/:reminderId', updateReminder);
router.delete('/:companyId/reminder', deleteMultipleReminders);

module.exports = router;
