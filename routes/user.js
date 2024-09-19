const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getAllUsers, updateUserProfile,updateUser, getSingleUser, updatePassword } = require('../controllers/user')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.get('/:companyId/user', getAllUsers);
router.get('/:companyId/user/:userId', getSingleUser);
router.put('/:companyId/user/:userId', updateUser);
router.put('/:companyId/user/:userId/profile', upload.single("profile-pic"),updateUserProfile);
router.put('/:companyId/user/:userId/update-password' ,updatePassword);

module.exports = router;
