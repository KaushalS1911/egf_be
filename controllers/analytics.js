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
const ExpenseModel = require("../models/expense");
const OtherIncomeModel = require("../models/other-income");
const ChargeInOutModel = require("../models/charge-in-out");
const PaymentInOutModel = require("../models/payment-in-out");
const TransferModel = require("../models/transfer");

async function allTransactions(req, res) {
    try {
        const { companyId } = req.params;

        const models = [
            {
                model: IssuedLoanModel,
                query: { deleted_at: null, company: companyId },
                fields: ['cashAmount', 'issueDate', 'loanNo'],
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
                fields: ['cashAmount', 'date', 'otherNumber', 'loan'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date',
            },
            {
                model: OtherLoanInterestModel,
                query: {},
                fields: ['paymentDetail', 'payDate', 'otherLoan'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            {
                model: ClosedOtherLoanModel,
                query: { },
                fields: ['paymentDetail', 'payDate', 'otherLoan'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: 'otherLoan',
                filter: item => item?.otherLoan?.company?.toString() === companyId
            },
            {
                model: ExpenseModel,
                query: { company: companyId },
                fields: ['paymentDetails', 'date', 'expenseType', 'category', 'description'],
                type: "Expense",
                category: "Payment Out",
                dateField: 'date',
            },
            {
                model: OtherIncomeModel,
                query: { company: companyId },
                fields: ['paymentDetails', 'date', 'incomeType', 'category', 'description'],
                type: "Other Income",
                category: "Payment In",
                dateField: 'date',
            },
            {
                model: ChargeInOutModel,
                query: {company: companyId},
                fields: ['chargeType', 'status', 'description', 'category', 'date', 'paymentDetails'],
                type: 'Charge In/Out',
                categoryField: 'status',
                dateField: 'date',
            },
            {
                model: PaymentInOutModel,
                query: {company: companyId},
                fields: ['party', 'status', 'description', 'date', 'paymentDetails'],
                type: 'Payment In/Out',
                categoryField: 'status',
                dateField: 'date',
                populate: 'party',
            }
        ];

        const results = await Promise.all(
            models.map(async ({ model, query, fields, populate, filter }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                let data = await queryExec;
                return filter ? data.filter(filter) : data;
            })
        );

        const validTransferTypes = ['Cash In Hand', 'Cash To Bank', 'Bank To Cash'];

        const transfers = (await TransferModel.find({ company: companyId }) || [])
            .filter(e => validTransferTypes.includes(e.transferType))
            .map(e => {
                const isPaymentIn =
                    (e.transferType === 'Cash In Hand' && e.paymentDetails?.adjustmentType === 'Add Cash') ||
                    e.transferType === 'Bank To Cash';

                const commonFields = {
                    status: e.transferType,
                    date: e.transferDate,
                    amount: e.paymentDetails?.amount ?? 0,
                };

                if (isPaymentIn) {
                    return {
                        ...commonFields,
                        category: 'Payment In',
                        ref: e.transferType === 'Bank To Cash'
                            ? 'Bank to cash transfer'
                            : 'Add cash amount for adjustment',
                        detail: e.transferType === 'Bank To Cash'
                            ? `Received from (${e.paymentDetails?.from?.bankName})`
                            : 'Add Cash for Adjustment',
                    };
                } else {
                    return {
                        ...commonFields,
                        category: 'Payment Out',
                        ref: e.transferType === 'Cash To Bank'
                            ? 'Cash to Bank transfer'
                            : 'Add Bank amount for adjustment',
                        detail: e.transferType === 'Cash To Bank'
                            ? `Add Cash to (${e.paymentDetails?.to?.bankName})`
                            : `Reduce Cash for Adjustment`,
                    };
                }
            });

        const transactions = results.flatMap((data, index) =>
            (Array.isArray(data) ? data : []).map(entry => ({
                category: models[index]?.categoryField ? entry[models[index].categoryField] : (models[index]?.category ?? 'Unknown'),
                ref: entry?.otherNumber ??
                    entry?.loanNo ??
                    entry?.loan?.loanNo ??
                    entry?.otherLoan?.otherNumber ??
                    entry?.category ??
                    entry?.description ?? '',
                detail: entry?.chargeType ??
                    entry?.party?.name ??
                    `${entry?.customer?.firstName ??
                    entry?.loan?.customer?.firstName ??
                    entry?.otherName ??
                    entry?.expenseType ??
                    entry?.incomeType}` + ` ${(entry?.customer?.lastName ?? entry?.loan?.customer?.lastName) || ''}`,
                status: models[index]?.type,
                date: entry[models[index]?.dateField] ??
                    null,
                amount: Number(entry?.cashAmount ??
                    entry?.paymentDetail?.cashAmount ??
                    entry?.paymentDetails?.cashAmount ?? 0),
            }))
        );

        [...transactions, ...transfers].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            status: 200,
            message: "All transactions fetched successfully",
            data: [...transactions, ...transfers].filter((e) => e?.amount !== 0)
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
                query: {deleted_at: null, company: companyId},
                fields: ['bankAmount', 'issueDate', 'companyBankDetail', 'loanNo'],
                type: "Loan issued",
                category: "Payment Out",
                dateField: 'issueDate',
                populate: 'customer company'
            },
            {
                model: InterestModel,
                query: {},
                fields: ['paymentDetail', 'createdAt'],
                type: "Customer Interest",
                category: "Payment In",
                dateField: 'createdAt',
                populate: {
                    path: 'loan',
                    populate: [
                        {path: 'customer'},
                        {path: 'company'}
                    ]
                },
                filter: item => item?.loan?.company?._id?.toString() === companyId
            },
            {
                model: PartReleaseModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Part Release",
                category: "Payment In",
                dateField: 'date',
                populate: {
                    path: 'loan',
                    populate: [
                        {path: 'customer'},
                        {path: 'company'}
                    ]
                },
                filter: item => item?.loan?.company?._id?.toString() === companyId
            },
            {
                model: PartPaymentModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Loan Part Payment",
                category: "Payment In",
                dateField: 'date',
                populate: {
                    path: 'loan',
                    populate: [
                        {path: 'customer'},
                        {path: 'company'}
                    ]
                },
                filter: item => item?.loan?.company?._id?.toString() === companyId
            },
            {
                model: UchakInterestModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Uchak Interest",
                category: "Payment In",
                dateField: 'date',
                populate: {
                    path: 'loan',
                    populate: [
                        {path: 'customer'},
                        {path: 'company'}
                    ]
                },
                filter: item => item?.loan?.company?._id?.toString() === companyId
            },
            {
                model: ClosedLoanModel,
                query: {},
                fields: ['paymentDetail', 'date'],
                type: "Customer Loan Close",
                category: "Payment In",
                dateField: 'date',
                populate: {
                    path: 'loan',
                    populate: [
                        {path: 'customer'},
                        {path: 'company'}
                    ]
                },
                filter: item => item?.loan?.company?._id?.toString() === companyId
            },
            {
                model: OtherIssuedLoanModel,
                query: {deleted_at: null, company: companyId},
                fields: ['bankAmount', 'date', 'otherNumber', 'loan', 'bankDetails', 'otherName'],
                type: "Other Loan Issued",
                category: "Payment In",
                dateField: 'date',
                populate: "company"
            },
            {
                model: OtherLoanInterestModel,
                query: {},
                fields: ['paymentDetail', 'payDate', 'otherLoan'],
                type: "Other Loan Interest",
                category: "Payment Out",
                dateField: 'payDate',
                populate: {
                    path: 'otherLoan',
                    populate: [
                        {path: 'company'}
                    ]
                },
                filter: item => item?.otherLoan?.company?._id?.toString() === companyId
            },
            {
                model: ClosedOtherLoanModel,
                query: {},
                fields: ['paymentDetail', 'payDate', 'otherLoan'],
                type: "Other Loan Close",
                category: "Payment Out",
                dateField: 'payDate',
                populate: {
                    path: 'otherLoan',
                    populate: [
                        {path: 'company'}
                    ]
                },
                filter: item => item?.otherLoan?.company?._id?.toString() === companyId
            },
            {
                model: ExpenseModel,
                query: {company: companyId},
                fields: ['paymentDetails', 'date', 'expenseType', 'category', 'description'],
                type: "Expense",
                category: "Payment Out",
                dateField: 'date',
                populate: 'company'
            },
            {
                model: OtherIncomeModel,
                query: {company: companyId},
                fields: ['paymentDetails', 'date', 'incomeType', 'category', 'description'],
                type: "Other Income",
                category: "Payment In",
                dateField: 'date',
                populate: 'company'
            },
            {
                model: ChargeInOutModel,
                query: {company: companyId},
                fields: ['chargeType', 'status', 'description', 'category', 'date', 'paymentDetails'],
                type: 'Charge In/Out',
                categoryField: 'status',
                dateField: 'date',
                populate: 'company'
            },
            {
                model: PaymentInOutModel,
                query: {company: companyId},
                fields: ['party', 'status', 'description', 'date', 'paymentDetails'],
                type: 'Payment In/Out',
                categoryField: 'status',
                dateField: 'date',
                populate: 'party company',
            },
        ];

        const results = await Promise.all(
            models.map(async ({ model, query, fields, populate, filter }) => {
                let queryExec = model.find(query).select(fields.join(' ')).lean();
                if (populate) queryExec = queryExec.populate(populate);
                let data = await queryExec;
                return filter ? data.filter(filter) : data;
            })
        );

        function getAccountHolderName(bankAccs, bankName) {
            const Account = bankName && bankAccs && bankAccs.find((e) => e.bankName === bankName);
            return Account?.accountHolderName
        }

        const validTransferTypes = ['Adjust Bank Balance', 'Cash To Bank', 'Bank To Cash', 'Bank To Bank'];

        const transfers = (await TransferModel.find({ company: companyId }) || [])
            .filter(e => validTransferTypes.includes(e.transferType))
            .map(e => {
                const isPaymentIn =
                    (e.transferType === 'Adjust Bank Balance' && e.paymentDetails?.adjustmentType === 'Add Adjust Balance') ||
                    e.transferType === 'Cash To Bank' || e.transferType === 'Bank To Bank' ;

                const commonFields = {
                    status: e.transferType,
                    date: e.transferDate,
                    amount: e.paymentDetails?.amount ?? 0,
                };

                if (isPaymentIn) {
                    return {
                        ...commonFields,
                        category: 'Payment In',
                        ref: '',
                        // ref: (e.transferType === 'Cash To Bank' || e.transferType === 'Bank To Bank')
                        //     ? e.transferType === 'Cash To Bank' ? `Add Cash in (${e.paymentDetails?.to?.bankName})` : `Transfer amount to (${e.paymentDetails?.to?.bankName}) from (${e.paymentDetails?.from?.bankName})`
                        //     : `Add amount in (${e.paymentDetails?.from?.bankName}) for adjustment`,
                        detail: (e.transferType === 'Cash To Bank' || e.transferType === 'Bank To Bank')
                            ? e.transferType === 'Cash To Bank' ? `Add Cash in (${e.paymentDetails?.to?.bankName})` : `Transfer amount to (${e.paymentDetails?.to?.bankName}) from (${e.paymentDetails?.from?.bankName})`
                            : `Add amount in (${e.paymentDetails?.from?.bankName}) for adjustment`,
                    };
                } else {
                    return {
                        ...commonFields,
                        category: 'Payment Out',
                        ref: '',
                        // ref: (e.transferType === 'Bank To Cash' || e.transferType === 'Bank To Bank' )
                        //     ? e.transferType === 'Bank To Cash' ? `Transfer Amount from Bank (${e.paymentDetails?.from?.bankName}) to Cash ` : `Transfer amount from (${e.paymentDetails?.from?.bankName}) to (${e.paymentDetails?.to?.bankName})`
                        //     : `Reduce Amount in (${e.paymentDetails?.from?.bankName}) for adjustment`,
                        detail: (e.transferType === 'Bank To Cash' || e.transferType === 'Bank To Bank')
                            ? e.transferType === 'Bank To Cash' ? `Transfer Amount from Bank (${e.paymentDetails?.from?.bankName}) to Cash` : `Transfer amount from (${e.paymentDetails?.from?.bankName}) to (${e.paymentDetails?.to?.bankName})`
                            : `Reduce Amount in (${e.paymentDetails?.from?.bankName}) for adjustment`,
                    };
                }
            });

        const transactions = results.flatMap((data, index) =>
            (Array.isArray(data) ? data : []).map(entry => ({
                category: models[index]?.categoryField ? entry[models[index].categoryField] : (models[index]?.category ?? 'Unknown'),
                ref: entry?.otherNumber ??
                    entry?.loanNo ??
                    entry?.loan?.loanNo ??
                    entry?.otherLoan?.otherNumber ??
                    entry?.description ?? '',
                company: entry?.company ?? entry?.loan?.company ?? entry?.otherLoan?.company ?? {},
                detail: `${entry?.customer?.firstName ??
                entry?.party?.name ??
                entry?.loan?.customer?.firstName ??
                entry?.otherName ??
                entry?.otherLoan?.otherName ??
                entry?.expenseType ??
                entry?.chargeType ??
                entry?.incomeType} ${(entry?.customer?.lastName ?? entry?.loan?.customer?.lastName) || ''}`,
                status: models[index]?.type,
                date: entry[models[index]?.dateField] ??
                    entry?.otherLoan?.date ??
                    null,
                bankName: entry?.companyBankDetail?.account?.bankName ??
                    entry?.paymentDetail?.account?.bankName ??
                    entry?.paymentDetails?.account?.bankName ??
                    entry?.paymentDetail?.bankName ??
                    entry?.bankDetails?.bankName ??
                    null,
                bankHolderName: getAccountHolderName(entry?.company?.bankAccounts, entry?.companyBankDetail?.account?.bankName) ??
                    getAccountHolderName(entry?.company?.bankAccounts, entry?.bankDetails?.account?.bankName) ??
                    getAccountHolderName(entry?.company?.bankAccounts, entry?.paymentDetails?.account?.bankName) ??
                    getAccountHolderName(entry?.company?.bankAccounts, entry?.paymentDetails?.companyBankDetail?.account?.bankName) ??
                    getAccountHolderName(entry?.company?.bankAccounts, entry?.paymentDetail?.bankName) ??
                    getAccountHolderName(entry?.otherLoan?.company?.bankAccounts, entry?.paymentDetail?.bankName) ??
                    getAccountHolderName(entry?.loan?.company?.bankAccounts, entry?.paymentDetail?.account?.bankName) ??
                    getAccountHolderName(entry?.loan?.company?.bankAccounts, entry?.paymentDetail?.bankName) ??
                    entry?.companyBankDetail?.account?.accountHolderName ??
                    entry?.paymentDetail?.account?.accountHolderName ??
                    entry?.paymentDetails?.account?.accountHolderName ??
                    entry?.paymentDetail?.accountHolderName ??
                    entry?.bankDetails?.accountHolderName ??
                    null,
                amount: Number(entry?.bankAmount ??
                    entry?.paymentDetails?.bankAmount ??
                    entry?.paymentDetail?.bankAmount ??
                    entry?.bankDetails?.bankAmount ?? 0),
            }))
        ).filter(t => t?.amount !== 0);

        const sumByBank = (bankName, type) =>
            [...transactions, ...transfers]
                .filter(txn => txn.category === type && txn.bankName === bankName)
                .reduce((sum, txn) => sum + txn.amount, 0);

        const company = await CompanyModel.findById(companyId).lean();

        const bankBalances = (company?.bankAccounts || []).map(bank => ({
            ...bank,
            balance: sumByBank(bank?.bankName, 'Payment In') - sumByBank(bank?.bankName, 'Payment Out')
        }));

        [...transactions, ...transfers].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            status: 200,
            message: "All transactions fetched successfully",
            data: {
                transactions: [...transactions, ...transfers],
                bankBalances
            }
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = {allTransactions, allBankTransactions}