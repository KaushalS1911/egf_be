const IssuedLoanModel = require("../models/issued-loan");
const InterestModel = require("../models/interest");
const UchakInterestModel = require("../models/uchak-interest-payment");
const PartReleaseModel = require("../models/part-release");
const PartPaymentModel = require("../models/loan-part-payment");
const ClosedLoanModel = require("../models/loan-close");
const OtherIssuedLoanModel = require("../models/other-issued-loan");
const OtherLoanInterestModel = require("../models/other-loan-interest-payment");
const ClosedOtherLoanModel = require("../models/other-loan-close");
const CompanyModel = require("../models/company");

async function allTransactions(req, res) {
    try {
        const { companyId } = req.params;

        const models = [
            {
                model: IssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['cashAmount', 'issueDate'],
                type: "Loan issued",
                category: "Payment Out",
                dateField: 'issueDate'
            },
            {
                model: InterestModel,
                query: { "loan.company": companyId }, // Filtering directly
                fields: ['paymentDetail', 'createdAt'],
                type: "Customer Interest",
                category: "Payment In",
                dateField: 'createdAt',
                populate: 'loan'
            },
            {
                model: PartReleaseModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Part Release",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: PartPaymentModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Loan Part Payment",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: UchakInterestModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Uchak Interest",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: ClosedLoanModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Customer Loan Close",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: OtherIssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['cashAmount', 'date'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date'
            },
            {
                model: OtherLoanInterestModel,
                query: { "otherLoan.company": companyId },
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan'
            },
            {
                model: ClosedOtherLoanModel,
                query: { "otherLoan.company": companyId },
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan'
            },
        ];

        const results = await Promise.all(
            models.map(({ model, query, fields, populate }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                return queryExec;
            })
        );

        const transactions = results.flatMap((data, index) =>
            (Array.isArray(data) ? data : []).map(entry => ({
                category: models[index]?.category ?? 'Unknown',
                detail: models[index]?.type ?? 'Unknown',
                date: entry[models[index]?.dateField] ?? null,
                amount: (entry?.cashAmount ?? entry?.paymentDetail?.cashAmount ?? 0),
                bankName: null
            }))
        );

        res.status(200).json({
            status: 200,
            message: "All transactions fetched successfully",
            data: transactions.filter((e) => e.amount !== 0)
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function allBankTransactions(req, res) {
    try {
        const { companyId } = req.params;

        const models = [
            {
                model: IssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['bankAmount', 'issueDate', 'companyBankDetail'],
                type: "Loan issued",
                category: "Payment Out",
                dateField: 'issueDate'
            },
            {
                model: InterestModel,
                query: { "loan.company": companyId }, // Filtering directly
                fields: ['paymentDetail', 'createdAt'],
                type: "Customer Interest",
                category: "Payment In",
                dateField: 'createdAt',
                populate: 'loan'
            },
            {
                model: PartReleaseModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Part Release",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: PartPaymentModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Loan Part Payment",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: UchakInterestModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Uchak Interest",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: ClosedLoanModel,
                query: { "loan.company": companyId },
                fields: ['paymentDetail', 'date'],
                type: "Customer Loan Close",
                category: "Payment In",
                dateField: 'date',
                populate: 'loan'
            },
            {
                model: OtherIssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['bankAmount', 'date', 'bankDetails'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date'
            },
            {
                model: OtherLoanInterestModel,
                query: { "otherLoan.company": companyId },
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan'
            },
            {
                model: ClosedOtherLoanModel,
                query: { "otherLoan.company": companyId },
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan'
            },
        ];

        const results = await Promise.all(
            models.map(({ model, query, fields, populate }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                return queryExec;
            })
        );

        const transactions = results.flatMap((data, index) =>
            (Array.isArray(data) ? data : []).map(entry => ({
                category: models[index]?.category ?? 'Unknown',
                detail: models[index]?.type ?? 'Unknown',
                date: entry[models[index]?.dateField] ?? null,
                amount: (entry?.bankAmount ?? entry?.paymentDetail?.bankAmount ?? 0),
                bankName: entry?.companyBankDetail?.account?.bankName ?? entry?.bankDetails?.bankName ?? entry?.paymentDetail?.bankName ?? null,
            }))
        );

        function bankWiseCreditTransaction(name) {
            return transactions.filter((trnx) => (trnx.category === 'Payment In' && trnx.bankName === name)).reduce((a,b) => a+b.amount, 0);
        }
        function bankWiseDebitTransaction(name) {
            return transactions.filter((trnx) => (trnx.category === 'Payment Out' && trnx.bankName === name)).reduce((a,b) => a+b.amount, 0);
        }

        const bankDetails = await CompanyModel.findById( companyId).lean()

        const bankBalances = bankDetails?.bankAccounts.map((bank) => {
            return {
                ...bank,
                balance: bankWiseCreditTransaction(bank.bankName) - bankWiseDebitTransaction(bank.bankName),
            }
        })

        res.status(200).json({
            status: 200,
            message: "All transactions fetched successfully",
            data: {
                transactions: transactions.filter((e) => e.amount !== 0),
                bankBalances
            }
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}


module.exports = {allTransactions, allBankTransactions}