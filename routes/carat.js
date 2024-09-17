const express = require('express');
const router = express.Router();
const { addCarat, getAllCarats,updateCarat,getSingleCarat, deleteMultipleCarats } = require('../controllers/carat')

router.post('/:companyId/carat', addCarat);
router.get('/:companyId/carat', getAllCarats);
router.get('/:companyId/carat/:caratId', getSingleCarat);
router.put('/:companyId/carat/:caratId', updateCarat);
router.delete('/:companyId/carat', deleteMultipleCarats);

module.exports = router;
