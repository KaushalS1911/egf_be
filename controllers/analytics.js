const IssuedLoanModel = require("../models/issued-loan");
const InterestModel = require("../models/interest");
const UchakInterestModel = require("../models/uchak-interest-payment");
const PartReleaseModel = require("../models/part-release");
const PartPaymentModel = require("../models/loan-part-payment");
const ClosedLoanModel = require("../models/loan-close");
const OtherIssuedLoanModel = require("../models/other-issued-loan");
const OtherLoanInterestModel = require("../models/other-loan-interest-payment");
const ClosedOtherLoanModel = require("../models/other-loan-close");
// const ExpenseModel = require("../models/expense");
// const OtherIncomeModel = require("../models/other-income");
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
                dateField: 'issueDate',
                populate: 'customer'
            },
            {
                model: InterestModel,
                query: { }, // Filtering directly
                fields: ['paymentDetail', 'createdAt'],
                type: "Customer Interest",
                category: "Payment In",
                dateField: 'createdAt',
                populate: {path: 'loan', populate: 'customer'},
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: PartReleaseModel,
                query: { },
                fields: ['paymentDetail', 'date'],
                type: "Part Release",
                category: "Payment In",
                dateField: 'date',
                populate: {path: 'loan', populate: 'customer'},
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: PartPaymentModel,
                query: { },
                fields: ['paymentDetail', 'date'],
                type: "Loan Part Payment",
                category: "Payment In",
                dateField: 'date',
                populate: {path: 'loan', populate: 'customer'},
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: UchakInterestModel,
                query: { },
                fields: ['paymentDetail', 'date'],
                type: "Uchak Interest",
                category: "Payment In",
                dateField: 'date',
                populate: {path: 'loan', populate: 'customer'},
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: ClosedLoanModel,
                query: { },
                fields: ['paymentDetail', 'date'],
                type: "Customer Loan Close",
                category: "Payment In",
                dateField: 'date',
                populate: {path: 'loan', populate: 'customer'},
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: OtherIssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['cashAmount', 'date'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date',
            },
            {
                model: OtherLoanInterestModel,
                query: {},
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            {
                model: ClosedOtherLoanModel,
                query: { },
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            // {
            //     model: ExpenseModel,
            //     query: { company: companyId },
            //     fields: ['paymentDetail', 'date'],
            //     type: "Expense",
            //     category: "Payment Out",
            //     dateField: 'date',
            // },
            // {
            //     model: OtherIncomeModel,
            //     query: { company: companyId },
            //     fields: ['paymentDetail', 'date'],
            //     type: "Other Income",
            //     category: "Payment In",
            //     dateField: 'date',
            // },
        ];

        const results = await Promise.all(
            models.map(async ({ model, query, fields, populate, filter }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                let data = await queryExec;
                return filter ? data.filter(filter) : data;
            })
        );


        const transactions = results.flatMap((data, index) =>
            (Array.isArray(data) ? data : []).map(entry => ({
                category: models[index]?.category ?? 'Unknown',
                detail: `${entry?.customer?.firstName ?? entry?.otherName} ${entry?.customer?.lastName || ''}`,
                status: models[index]?.type,
                date: entry[models[index]?.dateField] ?? null,
                amount: (entry?.cashAmount ?? entry?.paymentDetail?.cashAmount ?? 0),
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
                dateField: 'issueDate',
                populate: 'customer'
            },
            {
                model: InterestModel,
                query: {},
                fields: ['paymentDetail', 'createdAt'],
                type: "Customer Interest",
                category: "Payment In",
                dateField: 'createdAt',
                populate: { path: 'loan', populate: 'customer' },
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: PartReleaseModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Part Release",
                category: "Payment In",
                dateField: 'date',
                populate: { path: 'loan', populate: 'customer' },
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: PartPaymentModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Loan Part Payment",
                category: "Payment In",
                dateField: 'date',
                populate: { path: 'loan', populate: 'customer' },
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: UchakInterestModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Uchak Interest",
                category: "Payment In",
                dateField: 'date',
                populate: { path: 'loan', populate: 'customer' },
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: ClosedLoanModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Customer Loan Close",
                category: "Payment In",
                dateField: 'date',
                populate: { path: 'loan', populate: 'customer' },
                filter: item => item?.loan?.company?.toString() === companyId
            },
            {
                model: OtherIssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['bankAmount', 'date', 'bankDetails', 'otherName'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date'
            },
            {
                model: OtherLoanInterestModel,
                query: {},
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            {
                model: ClosedOtherLoanModel,
                query: {},
                fields: ['paymentDetail', 'payDate'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            // {
            //     model: ExpenseModel,
            //     query: { company: companyId },
            //     fields: ['paymentDetail', 'date'],
            //     type: "Expense",
            //     category: "Payment Out",
            //     dateField: 'date'
            // },
            // {
            //     model: OtherIncomeModel,
            //     query: { company: companyId },
            //     fields: ['paymentDetail', 'date'],
            //     type: "Other Income",
            //     category: "Payment In",
            //     dateField: 'date'
            // }
        ];

        const results = await Promise.all(
            models.map(async ({ model, query, fields, populate, filter }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                let data = await queryExec;
                return filter ? data.filter(filter) : data;
            })
        );

        const transactions = results.flatMap((data, index) => {
            const config = models[index];
            return (Array.isArray(data) ? data : []).map(entry => {
                const customer = entry?.customer || entry?.loan?.customer || entry?.otherLoan?.customer;
                const name = `${customer?.firstName ?? entry?.otherName ?? ''} ${customer?.lastName ?? ''}`.trim();
                const amount = entry?.bankAmount ?? entry?.paymentDetail?.bankAmount ?? 0;
                const bankName =
                    entry?.companyBankDetail?.account?.bankName ??
                    entry?.bankDetails?.bankName ??
                    entry?.paymentDetail?.account?.bankName ?? null;

                return {
                    category: config.category,
                    detail: name,
                    status: config.type,
                    date: entry[config.dateField] ?? null,
                    amount,
                    bankName
                };
            });
        });

        const filteredTransactions = transactions.filter(t => t.amount !== 0);

        const sumByBank = (bankName, type) =>
            filteredTransactions
                .filter(txn => txn.category === type && txn.bankName === bankName)
                .reduce((sum, txn) => sum + txn.amount, 0);

        const company = await CompanyModel.findById(companyId).lean();

        const bankBalances = (company?.bankAccounts || []).map(bank => ({
            ...bank,
            balance: sumByBank(bank?.bankName, 'Payment In') - sumByBank(bank?.bankName, 'Payment Out')
        }));

        res.status(200).json({
            status: 200,
            message: "All transactions fetched successfully",
            data: {
                transactions: filteredTransactions,
                bankBalances
            }
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}



module.exports = {allTransactions, allBankTransactions}