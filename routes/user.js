const express = require('express');
const router = express.Router();
const auth = require("../middlewares/auth")
const { getAllUsers, updateUserProfile,updateUser, getSingleUser, getUser } = require('../controllers/user')

router.get('/:companyId/branch/:branchId/user', getAllUsers);
router.get('/:companyId/branch/:branchId/user/:userId', getSingleUser);
router.put('/:companyId/branch/:branchId/user/:userId', updateUser);
router.delete('/:companyId/branch/:branchId/user/:userId', updateUserProfile);
router.get('/me', auth ,getUser);

module.exports = router;
