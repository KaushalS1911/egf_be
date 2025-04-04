const express = require('express');
const {allTransactions, allBankTransactions} = require("../controllers/analytics");

const router = express.Router();

router.get("/:companyId/cash-transactions", allTransactions)
router.get("/:companyId/bank-transactions", allBankTransactions)

module.exports = router;