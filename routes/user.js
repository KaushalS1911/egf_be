const express = require('express');
const router = express.Router();
const { addBranch, getAllBranches, updateBranch, getSingleBranch,deleteMultipleBranches } = require('../controllers/branch')

router.post('/', addBranch);
router.get('/', getAllBranches);
router.get('/:branchId', getSingleBranch);
router.put('/:branchId', updateBranch);
router.delete('/', deleteMultipleBranches);

module.exports = router;
