const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserProfile,updateUser, getSingleUser } = require('../controllers/user')

router.get('/:companyId/branch/:branchId/user', getAllUsers);
router.get('/:companyId/branch/:branchId/user/:userId', getSingleUser);
router.put('/:companyId/branch/:branchId/user/:userId', updateUser);
router.delete('/:companyId/branch/:branchId/user/:userId', updateUserProfile);

module.exports = router;
