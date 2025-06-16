const mongoose = require('mongoose');
const Scheme = require("../models/scheme");
const Customer = require("../models/customer");
const Company = require("../models/company");
const Inquiry = require("../models/inquiry");
const IssuedLoan = require("../models/issued-loan");
const LoanClose = require("../models/loan-close");
const Interest = require("../models/interest");
const OtherIssuedLoan = require('../models/other-issued-loan');
const OtherLoanClose = require('../models/other-loan-close');
const OtherLoanInterestPayment = require("../models/other-loan-interest-payment");
const ChargeInOut = require('../models/charge-in-out');
const Expense = require('../models/expense');
const PaymentInOut = require('../models/payment-in-out');
const Party = require("../models/party");
const PartPayment = require("../models/loan-part-payment");
const PartRelease = require("../models/part-release");
const moment = require('moment');

const INQUIRY_REFERENCE_BY = [
    'Google',
    'Just Dial',
    'Social Media',
    'Board Banner',
    'Brochure',
    'Other'
];

const getDateRange = (filter, companyCreatedAt = null) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (filter) {
        case 'all':
            start.setTime(companyCreatedAt ? new Date(companyCreatedAt).getTime() : 0);
            end.setTime(now.getTime());
            break;

        case 'this_week':
            start.setDate(now.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_month':
            start.setMonth(now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_3_months':
            const last3 = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            const last3End = new Date(now.getFullYear(), now.getMonth(), 0);
            start.setTime(last3.getTime());
            start.setHours(0, 0, 0, 0);
            end.setTime(last3End.getTime());
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_6_months':
            const last6 = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            const last6End = new Date(now.getFullYear(), now.getMonth(), 0);
            start.setTime(last6.getTime());
            start.setHours(0, 0, 0, 0);
            end.setTime(last6End.getTime());
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_year':
            start.setFullYear(now.getFullYear() - 1, 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(now.getFullYear() - 1, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_2_years':
            start.setFullYear(now.getFullYear() - 2, 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(now.getFullYear() - 1, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;

        case 'this_year':
            start.setFullYear(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            end.setHours(23, 59, 59, 999);
            break;

        case 'this_month':
        default:
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            end.setHours(23, 59, 59, 999);
            break;
    }

    return {start, end};
};

const getAreaAndReferenceStats = async (req, res) => {
    const {companyId} = req.params;
    const {timeRange = 'this_month', branchId, fields = ''} = req.query;

    const requestedFields = fields.split(',').map(f => f.trim().toLowerCase());
    const includeAll = requestedFields.length === 0 || requestedFields.includes('all');

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    const company = await Company.findById(companyId).select('createdAt');
    if (!company) {
        return res.status(404).json({success: false, message: "Company not found"});
    }

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({success: false, message: "Invalid branch ID"});
    }

    try {
        const {start, end} = getDateRange(timeRange, company.createdAt);

        const customerMatch = {
            company: companyId,
            deleted_at: null,
            createdAt: {$gte: start, $lte: end}
        };

        if (branchId) {
            customerMatch.branch = branchId;
        }

        const responseData = {};
        let customerIds = [];

        if (includeAll || requestedFields.includes('customerstats') || requestedFields.includes('references') || requestedFields.includes('areas')) {
            const customers = await Customer.find(customerMatch).select('_id');
            customerIds = customers.map(c => c._id);
        }

        if (includeAll || requestedFields.includes('references')) {
            const referenceCounts = await Customer.aggregate([
                {$match: customerMatch},
                {
                    $project: {
                        reference: {
                            $cond: {
                                if: {$in: ["$referenceBy", INQUIRY_REFERENCE_BY.slice(0, -1)]},
                                then: "$referenceBy",
                                else: "Other"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$reference",
                        count: {$sum: 1}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        reference: "$_id",
                        count: 1
                    }
                }
            ]);

            responseData.references = INQUIRY_REFERENCE_BY.map(ref => {
                const found = referenceCounts.find(item => item.reference === ref);
                return {
                    label: ref,
                    value: found ? found.count : 0
                };
            });
        }

        if (includeAll || requestedFields.includes('areas')) {
            const areaStats = await Customer.aggregate([
                {$match: customerMatch},
                {
                    $group: {
                        _id: "$permanentAddress.area",
                        value: {$sum: 1}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        label: "$_id",
                        value: 1
                    }
                }
            ]);
            responseData.areas = areaStats;
        }

        if (includeAll || requestedFields.includes('customerstats')) {
            const loanMatch = {
                deleted_at: null,
                company: companyId,
                status: {$in: ["Disbursed", "Regular", "Overdue"]},
                createdAt: {$gte: start, $lte: end},
                customer: {$in: customerIds}
            };

            const activeLoanCustomerCount = await IssuedLoan.distinct("customer", loanMatch).then(ids => ids.length);

            const totalCustomerMatch = {
                company: companyId,
                deleted_at: null,
            };

            if (branchId) {
                totalCustomerMatch.branch = branchId;
            }

            const totalCustomerCount = await Customer.countDocuments(totalCustomerMatch);

            responseData.customerStats = {
                newCustomerCount: customerIds.length,
                activeLoanCustomerCount,
                totalCustomerCount
            };
        }

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error fetching area and reference stats:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getInquiryStatusSummary = async (req, res) => {
    const {companyId} = req.params;
    const {timeRange = 'this_month', branchId} = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({success: false, message: "Invalid branch ID"});
    }

    const company = await Company.findById(companyId).select('createdAt');
    if (!company) {
        return res.status(404).json({success: false, message: "Company not found"});
    }

    try {
        const {start, end} = getDateRange(timeRange, company.createdAt);
        const allowedStatuses = ["Active", "Completed", "Responded", "Not Responded"];

        const matchQuery = {
            deleted_at: null,
            company: companyId,
            status: {$in: allowedStatuses},
            createdAt: {$gte: start, $lte: end}
        };

        if (branchId) {
            matchQuery.branch = branchId;
        }

        const statusCounts = await Inquiry.aggregate([
            {$match: matchQuery},
            {
                $group: {
                    _id: "$status",
                    count: {$sum: 1}
                }
            },
            {
                $project: {
                    _id: 0,
                    label: "$_id",
                    value: "$count"
                }
            }
        ]);

        const formattedData = allowedStatuses.map(status => {
            const found = statusCounts.find(item => item.label === status);
            return {
                label: status,
                value: found ? found.value : 0
            };
        });

        const totalInquiries = formattedData.reduce((sum, item) => sum + item.value, 0);

        res.status(200).json({
            success: true,
            data: formattedData,
            total: totalInquiries
        });

    } catch (error) {
        console.error("Error fetching inquiry status summary:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getLoanAmountPerScheme = async (req, res) => {
    const {companyId} = req.params;
    const {timeRange = 'this_month'} = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    const company = await Company.findById(companyId).select('createdAt');
    if (!company) {
        return res.status(404).json({success: false, message: "Company not found"});
    }

    try {
        const {start, end} = getDateRange(timeRange, company.createdAt);

        const allLoans = await IssuedLoan.find({
            company: companyId,
            deleted_at: null,
            createdAt: {$gte: start, $lte: end}
        }).populate('scheme');

        const schemeLoanMap = {};
        for (const loan of allLoans) {
            const schemeIdStr = loan?.scheme?._id?.toString();
            if (!schemeIdStr) continue;

            if (!schemeLoanMap[schemeIdStr]) {
                schemeLoanMap[schemeIdStr] = [];
            }
            schemeLoanMap[schemeIdStr].push(loan);
        }

        const schemeIds = Object.keys(schemeLoanMap);
        const schemes = await Scheme.find({
            _id: {$in: schemeIds},
            company: companyId,
            deleted_at: null
        });

        let globalLoanTotal = 0;
        let totalloans = 0;
        let totalLoanInterestRate = 0;

        const categories = [];
        const series = [{
            name: "Interest Loan Amount",
            data: []
        }];

        const result = schemes.map(scheme => {
            const schemeIdStr = scheme._id.toString();
            const loans = schemeLoanMap[schemeIdStr] || [];

            const totalLoanAmount = loans.reduce((sum, l) => sum + (l.interestLoanAmount || 0), 0);
            const loanCount = loans.length;

            globalLoanTotal += totalLoanAmount;
            totalloans += loanCount;

            totalLoanInterestRate += loans.reduce((sum, l) => {
                return sum + (l?.scheme?.interestRate || 0);
            }, 0);

            const interestLabel = scheme.interestRate != null ? ` (${scheme.interestRate}%)` : " (0%)";
            categories.push(`${scheme.name}${interestLabel}`);
            series[0].data.push(totalLoanAmount);

            return {
                schemeId: scheme._id,
                schemeName: scheme.name,
                totalLoanAmount,
                loanCount,
                avgInterestRate: scheme.interestRate || 0
            };
        });

        const globalAvgInterestRate = totalloans > 0
            ? (totalLoanInterestRate / totalloans)
            : 0;

        res.status(200).json({
            success: true,
            data: result,
            global: {
                totalLoanAmount: globalLoanTotal,
                avgInterestRate: globalAvgInterestRate
            },
            chartData: {
                categories,
                series
            }
        });
    } catch (error) {
        console.error("Error fetching loan amount per scheme:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getAllLoanStatsWithCharges = async (req, res) => {
    const {companyId} = req.params;
    const {timeRange = "this_month", branchId, fields} = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({success: false, message: "Invalid branch ID"});
    }

    const company = await Company.findById(companyId).select('createdAt');
    if (!company) {
        return res.status(404).json({success: false, message: "Company not found"});
    }

    try {
        const {start, end} = getDateRange(timeRange, company.createdAt);

        const customerFilter = {
            company: companyId,
            deleted_at: null
        };
        if (branchId) customerFilter.branch = branchId;

        const customers = await Customer.find(customerFilter).select('_id');
        const customerIds = customers.map(c => c._id.toString());

        const chargeQuery = {
            company: companyId,
            date: {$gte: start, $lte: end},
            deleted_at: null,
        };
        if (branchId) chargeQuery.branch = branchId;

        const chargeEntries = await ChargeInOut.find(chargeQuery);

        let chargeInFromModule = 0;
        let chargeOutFromModule = 0;

        for (const entry of chargeEntries) {
            const payment = entry.paymentDetail || {};
            const cash = Number(payment.cashAmount) || 0;
            const bank = Number(payment.bankAmount) || 0;
            const total = cash + bank;

            if (entry.status === "Payment In") {
                chargeInFromModule += total;
            } else if (entry.status === "Payment Out") {
                chargeOutFromModule += total;
            }
        }

        const chargeIn = chargeInFromModule;
        const chargeOut = chargeOutFromModule;
        const chargeDifference = chargeIn - chargeOut;

        const interestsMain = await Interest.find({
            createdAt: {$gte: start, $lte: end}
        }).populate('loan');

        const filteredInterestsMain = interestsMain.filter(i =>
            i.loan &&
            i.loan.company?.toString() === companyId &&
            i.loan.customer &&
            customerIds.includes(i.loan.customer.toString())
        );

        const interestInMain = filteredInterestsMain.reduce((sum, i) => sum + (i.amountPaid || 0), 0);

        const interestOutRecords = await OtherLoanInterestPayment.find({
            createdAt: {$gte: start, $lte: end}
        }).populate({
            path: "otherLoan",
            select: "company customer deleted_at"
        });

        const filteredInterestOutRecords = interestOutRecords.filter(p => {
            const loan = p.otherLoan;
            return loan &&
                loan.company?.toString() === companyId &&
                loan.deleted_at == null
        });

        let interestOutOther = 0;
        for (const p of filteredInterestOutRecords) {
            const payment = p.paymentDetail || {};
            const cash = Number(payment.cashAmount) || 0;
            const bank = Number(payment.bankAmount) || 0;
            interestOutOther += cash + bank;
        }

        const interestDifference = interestInMain - interestOutOther;

        const response = {
            success: true,
            data: {
                charge: {
                    chargeIn: chargeIn.toFixed(2),
                    chargeOut: chargeOut.toFixed(2),
                    chargeDifference: chargeDifference.toFixed(2),
                },
                interest: {
                    interestInMain: interestInMain.toFixed(2),
                    interestOutOther: interestOutOther.toFixed(2),
                    interestDifference: interestDifference.toFixed(2),
                }
            }
        };

        if (fields) {
            const selectedFields = fields.split(',');
            const filteredResponse = {};
            selectedFields.forEach(field => {
                if (response.data[field]) {
                    filteredResponse[field] = response.data[field];
                }
            });
            return res.status(200).json({
                success: true,
                data: filteredResponse
            });
        }

        res.status(200).json(response);

    } catch (error) {
        console.error("Error in getAllLoanStatsWithCharges:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getCompanyPortfolioSummary = async (req, res) => {
    try {
        const {companyId} = req.params;

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({success: false, message: "Invalid company ID"});
        }

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({success: false, message: "Company not found"});
        }

        const companyStartDate = company.createdAt;

        const issuedLoans = await IssuedLoan.find({
            company: companyId,
            issueDate: {$ne: null},
            deleted_at: null
        });

        const totalLoanPortfolio = issuedLoans.reduce((sum, loan) => {
            return sum + (Number(loan.loanAmount) || 0);
        }, 0);

        const interestLoanAmount = issuedLoans.reduce((sum, loan) => {
            return sum + (Number(loan.interestLoanAmount) || 0);
        }, 0);

        const totalClosedLoanAmount = totalLoanPortfolio - interestLoanAmount;

        const now = new Date();
        const totalMonths = (now.getFullYear() - companyStartDate.getFullYear()) * 12 +
            (now.getMonth() - companyStartDate.getMonth()) + 1;

        const monthlyAveragePortfolio = totalMonths > 0
            ? totalLoanPortfolio / totalMonths
            : totalLoanPortfolio;

        res.json({
            success: true,
            data: {
                totalLoanPortfolio: Number(totalLoanPortfolio.toFixed(2)),
                interestLoanAmount: Number(interestLoanAmount.toFixed(2)),
                totalClosedLoanAmount: Number(totalClosedLoanAmount.toFixed(2)),
                monthlyAveragePortfolio: Number(monthlyAveragePortfolio.toFixed(2)),
                totalMonthsTracked: totalMonths,
                companyStartMonth: companyStartDate
            }
        });

    } catch (error) {
        console.error("Error in getCompanyPortfolioSummary:", error);
        res.status(500).json({success: false, message: "Internal server error", error});
    }
};

const getOtherLoanChart = async (req, res) => {
    try {
        const {companyId} = req.params;

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({success: false, message: "Invalid company ID"});
        }

        const companyExists = await Company.exists({_id: companyId});
        if (!companyExists) {
            return res.status(404).json({success: false, message: "Company not found"});
        }

        const newLoans = await OtherIssuedLoan.find({deleted_at: null, company: companyId});
        const closedLoans = await OtherLoanClose.find().populate({
            path: 'otherLoan',
            match: {company: companyId}
        });

        const buildChartData = (type, groupFormat, categories) => {
            const incomeMap = new Map();
            const expenseMap = new Map();

            newLoans.forEach((loan) => {
                const key = moment(loan.date).format(groupFormat);
                incomeMap.set(key, (incomeMap.get(key) || 0) + (loan.otherLoanAmount || 0));
            });

            closedLoans.forEach((loan) => {
                if (!loan.otherLoan) return;
                const key = moment(loan.payDate).format(groupFormat);
                expenseMap.set(key, (expenseMap.get(key) || 0) + (loan.paidLoanAmount || 0));
            });

            const incomeData = [];
            const expenseData = [];
            const diffData = [];

            categories.forEach((key) => {
                const income = incomeMap.get(key) || 0;
                const expense = expenseMap.get(key) || 0;
                incomeData.push(income);
                expenseData.push(expense);
                diffData.push(income - expense);
            });

            return {
                categories,
                type,
                data: [
                    {name: 'New Other Loan', data: incomeData},
                    {name: 'Close Other Loan', data: expenseData},
                    {name: 'difference', data: diffData}
                ]
            };
        };

        const weekCategories = [];
        for (let i = 6; i >= 0; i--) {
            weekCategories.push(moment().subtract(i, 'days').format('ddd'));
        }

        const monthCategories = [];
        for (let i = 0; i < 12; i++) {
            monthCategories.push(moment().month(i).format('MMM'));
        }

        const yearCategories = [];
        for (let i = 4; i >= 0; i--) {
            yearCategories.push(moment().subtract(i, 'years').format('YYYY'));
        }

        const last2WeeksCategories = [];
        for (let i = 13; i >= 0; i--) {
            last2WeeksCategories.push(moment().subtract(i, 'days').format('DD MMM'));
        }

        const series = [
            buildChartData('Week', 'ddd', weekCategories),
            buildChartData('Month', 'MMM', monthCategories),
            buildChartData('Year', 'YYYY', yearCategories),
            buildChartData('Last 2 Weeks', 'DD MMM', last2WeeksCategories)
        ];

        return res.json({series});

    } catch (error) {
        console.error(error);
        return res.status(500).json({message: 'Internal server error'});
    }
};

const getLoanChartData = async (req, res) => {
    try {
        const {companyId} = req.params;

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({success: false, message: "Invalid company ID"});
        }

        const companyExists = await Company.exists({_id: companyId});
        if (!companyExists) {
            return res.status(404).json({success: false, message: "Company not found"});
        }

        const series = [];

        const timeConfigs = [
            {
                type: "Last 2 Weeks",
                start: moment().subtract(13, "days").startOf("day"),
                end: moment().endOf("day"),
                categories: Array.from({length: 14}, (_, i) =>
                    moment().subtract(13 - i, "days").format("DD MMM")
                ),
                groupFormat: "DD MMM",
                key: "issueDate",
                closeKey: "date",
            },
            {
                type: "Week",
                start: moment().startOf("week"),
                end: moment().endOf("week"),
                categories: Array.from({length: 7}, (_, i) =>
                    moment().startOf("week").add(i, "days").format("ddd")
                ),
                groupFormat: "ddd",
                key: "issueDate",
                closeKey: "date",
            },
            {
                type: "Month",
                start: moment().startOf("year"),
                end: moment().endOf("year"),
                categories: moment.monthsShort(),
                groupFormat: "MMM",
                key: "issueDate",
                closeKey: "date",
            },
            {
                type: "Year",
                start: moment().subtract(4, "years").startOf("year"),
                end: moment().endOf("year"),
                categories: Array.from({length: 5}, (_, i) =>
                    moment().subtract(4 - i, "years").format("YYYY")
                ),
                groupFormat: "YYYY",
                key: "issueDate",
                closeKey: "date",
            },
        ];

        for (const config of timeConfigs) {
            const issuedLoans = await IssuedLoan.find({
                [config.key]: {$gte: config.start.toDate(), $lte: config.end.toDate()},
                company: companyId,
            });

            const loanCloses = await LoanClose.find({
                [config.closeKey]: {$gte: config.start.toDate(), $lte: config.end.toDate()},
            }).populate({
                path: "loan",
                match: {company: companyId},
                select: "company loanAmount",
            });

            const filteredLoanCloses = loanCloses.filter(item => item.loan != null);

            const partPayments = await PartPayment.find({
                date: {$gte: config.start.toDate(), $lte: config.end.toDate()},
                deleted_at: null,
            }).populate({
                path: "loan",
                match: {company: companyId},
                select: "company",
            });

            const validPartPayments = partPayments.filter(item => item.loan != null);

            const partReleases = await PartRelease.find({
                date: {$gte: config.start.toDate(), $lte: config.end.toDate()},
                deleted_at: null,
            }).populate({
                path: "loan",
                match: {company: companyId},
                select: "company",
            });

            const validPartReleases = partReleases.filter(item => item.loan != null);

            const groupData = (items, key, amountField, format) => {
                const grouped = {};
                items.forEach((item) => {
                    const label = moment(item[key]).format(format);
                    const amount = item[amountField] || 0;
                    grouped[label] = (grouped[label] || 0) + amount;
                });
                return config.categories.map(label => grouped[label] || 0);
            };

            const newLoanData = groupData(issuedLoans, config.key, "loanAmount", config.groupFormat);
            const loanCloseData = groupData(filteredLoanCloses, config.closeKey, "netAmount", config.groupFormat);
            const partPaymentData = groupData(validPartPayments, "date", "amountPaid", config.groupFormat);
            const partReleaseData = groupData(validPartReleases, "date", "adjustedAmount", config.groupFormat);

            const closeLoanData = config.categories.map((label, i) =>
                (loanCloseData[i] || 0) + (partPaymentData[i] || 0) + (partReleaseData[i] || 0)
            );

            const differenceData = newLoanData.map((v, i) => v - closeLoanData[i]);

            series.push({
                categories: config.categories,
                type: config.type,
                data: [
                    {name: "New Loan", data: newLoanData},
                    {name: "Close Loan", data: closeLoanData},
                    {name: "difference", data: differenceData},
                ],
            });
        }

        return res.status(200).json({series});
    } catch (err) {
        console.error("Chart data error:", err);
        return res.status(500).json({success: false, message: "Internal Server Error"});
    }
};

const getPaymentInOutSummary = async (req, res) => {
    const {companyId} = req.params;
    const {timeRange = 'this_month', branchId, fields = ''} = req.query;

    const requestedFields = fields.split(',').map(f => f.trim().toLowerCase());
    const includeAll = requestedFields.length === 0 || requestedFields.includes('all');

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({success: false, message: "Invalid branch ID"});
    }

    try {
        const company = await Company.findById(companyId).select('createdAt');
        if (!company) {
            return res.status(404).json({success: false, message: "Company not found"});
        }

        const {start, end} = getDateRange(timeRange, company.createdAt);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        const baseMatch = {
            company: companyId,
            date: {$gte: start, $lte: end},
            deleted_at: null
        };
        if (branchId) baseMatch.branch = branchId;

        const payments = await PaymentInOut.aggregate([
            {$match: baseMatch},
            {
                $group: {
                    _id: "$status",
                    totalCash: {
                        $sum: {$toDouble: {$ifNull: ["$paymentDetail.cashAmount", 0]}}
                    },
                    totalBank: {
                        $sum: {$toDouble: {$ifNull: ["$paymentDetail.bankAmount", 0]}}
                    }
                }
            }
        ]);

        let paymentInTotal = 0;
        let paymentOutTotal = 0;

        payments.forEach(p => {
            const total = p.totalCash + p.totalBank;
            if (p._id === 'Payment In') {
                paymentInTotal = total;
            } else if (p._id === 'Payment Out') {
                paymentOutTotal = total;
            }
        });

        const difference = paymentInTotal - paymentOutTotal;

        let totalExpense = 0;
        if (includeAll || requestedFields.includes('totalexpense')) {
            const expenseResult = await Expense.aggregate([
                {$match: baseMatch},
                {
                    $group: {
                        _id: null,
                        totalCash: {
                            $sum: {$toDouble: {$ifNull: ["$paymentDetail.cashAmount", 0]}}
                        },
                        totalBank: {
                            $sum: {$toDouble: {$ifNull: ["$paymentDetail.bankAmount", 0]}}
                        }
                    }
                }
            ]);
            if (expenseResult.length > 0) {
                totalExpense = expenseResult[0].totalCash + expenseResult[0].totalBank;
            }
        }

        let receivableAmt = 0;
        let payableAmt = 0;

        if (
            includeAll ||
            requestedFields.includes('receivableamt') ||
            requestedFields.includes('payableamt') ||
            requestedFields.includes('receivablepayabledifference')
        ) {
            const partyMatch = {
                company: companyId,
                ...(branchId && {branch: branchId})
            };

            const party = await Party.find(partyMatch).select('amount');

            receivableAmt = party.reduce(
                (prev, next) => next.amount < 0 ? prev + Math.abs(next.amount) : prev,
                0
            );

            payableAmt = party.reduce(
                (prev, next) => next.amount > 0 ? prev + next.amount : prev,
                0
            );
        }

        const receivablePayableDifference = receivableAmt - payableAmt;

        const responseData = {days};

        if (includeAll || requestedFields.includes('paymentintotal')) {
            responseData.paymentInTotal = paymentInTotal;
            responseData.avgPaymentInPerDay = +(paymentInTotal / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('paymentouttotal')) {
            responseData.paymentOutTotal = paymentOutTotal;
            responseData.avgPaymentOutPerDay = +(paymentOutTotal / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('difference')) {
            responseData.difference = difference;
            responseData.avgDifferencePerDay = +(difference / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('totalexpense')) {
            responseData.totalExpense = totalExpense;
            responseData.avgExpensePerDay = +(totalExpense / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('receivableamt')) {
            responseData.receivableAmt = receivableAmt;
            responseData.avgReceivablePerDay = +(receivableAmt / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('payableamt')) {
            responseData.payableAmt = payableAmt;
            responseData.avgPayablePerDay = +(payableAmt / days).toFixed(2);
        }

        if (includeAll || requestedFields.includes('receivablepayabledifference')) {
            responseData.receivablePayableDifference = receivablePayableDifference;
            responseData.avgReceivablePayablePerDay = +(receivablePayableDifference / days).toFixed(2);
        }

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error fetching payment summary:", error);
        res.status(500).json({success: false, message: "Internal server error"});
    }
};

const getTotalInOutAmount = async (req, res) => {
    const {companyId} = req.params;
    const {branchId} = req.query;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }
    if (branchId && !mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({success: false, message: "Invalid branch ID"});
    }

    try {
        const company = await Company.findById(companyId).select('createdAt');
        if (!company) {
            return res.status(404).json({success: false, message: "Company not found"});
        }

        const branchFilter = branchId ? {branch: branchId} : {};
        const commonFilter = {company: companyId, deleted_at: null, ...branchFilter};

        const issuedLoanIds = (await IssuedLoan.find(commonFilter).distinct('_id')).map(String);
        const otherLoanIds = (await OtherIssuedLoan.find(commonFilter).distinct('_id')).map(String);

        const sumFromCollection = async (Model, matchFilter, sumField) => {
            const result = await Model.aggregate([
                {$match: matchFilter},
                {$group: {_id: null, total: {$sum: `$${sumField}`}}}
            ]);
            return result[0]?.total || 0;
        };

        const [
            interestAmount,
            partPayment,
            otherLoan,
            otherLoanClose,
            loanPaymentAmount
        ] = await Promise.all([
            sumFromCollection(Interest, {loan: {$in: issuedLoanIds}, deleted_at: null}, 'amountPaid'),
            sumFromCollection(PartPayment, {loan: {$in: issuedLoanIds}, deleted_at: null}, 'amountPaid'),
            sumFromCollection(OtherIssuedLoan, commonFilter, 'otherLoanAmount'),
            sumFromCollection(OtherLoanClose, {otherLoan: {$in: otherLoanIds}, deleted_at: null}, 'paidLoanAmount'),
            sumFromCollection(IssuedLoan, commonFilter, 'loanAmount')
        ]);

        const reduceCashBank = (items, filterFn = () => true) => {
            return items.reduce((acc, item) => {
                if (filterFn(item)) {
                    const cash = Number(item?.paymentDetail?.cashAmount || 0);
                    const bank = Number(item?.paymentDetail?.bankAmount || 0);
                    acc.cash += cash;
                    acc.bank += bank;
                }
                return acc;
            }, {cash: 0, bank: 0});
        };

        const partReleases = await PartRelease.find({loan: {$in: issuedLoanIds}, deleted_at: null});
        const partReleaseAmounts = reduceCashBank(partReleases);
        const partRelease = partReleaseAmounts.cash + partReleaseAmounts.bank;

        const loanCloseList = await LoanClose.find({loan: {$in: issuedLoanIds}, deleted_at: null});
        const loanCloseAmounts = reduceCashBank(loanCloseList);
        const loanCloseTotal = loanCloseAmounts.cash + loanCloseAmounts.bank;

        const chargeInOutAll = await ChargeInOut.find(commonFilter);
        const chargeReceivable = reduceCashBank(chargeInOutAll, item => item.status === 'Payment In');
        const chargeOutPayable = reduceCashBank(chargeInOutAll, item => item.status === 'Payment Out');
        const chargeReceivableTotal = chargeReceivable.cash + chargeReceivable.bank;
        const chargeOutPayableTotal = chargeOutPayable.cash + chargeOutPayable.bank;

        const partyList = await Party.find({company: companyId, ...branchFilter}).select('amount');
        const partyReceivable = partyList.reduce((acc, p) => p.amount < 0 ? acc + Math.abs(p.amount) : acc, 0);
        const partyPayable = partyList.reduce((acc, p) => p.amount >= 0 ? acc + p.amount : acc, 0);

        const expenses = await Expense.find(commonFilter);
        const expenseAmounts = reduceCashBank(expenses);
        const expenseTotal = expenseAmounts.cash + expenseAmounts.bank;

        const otherLoanInterestList = await OtherLoanInterestPayment.find({
            otherLoan: {$in: otherLoanIds},
            deleted_at: null
        });

        const adjustedInterest = otherLoanInterestList.reduce((acc, item) => {
            const cash = Number(item?.paymentDetail?.cashAmount || 0);
            const bank = Number(item?.paymentDetail?.bankAmount || 0);
            const charge = Number(item?.charge || 0);
            return acc + (cash + bank - charge);
        }, 0);

        const otherLoanInterest = adjustedInterest;

        const allInAmount = interestAmount + partPayment + partRelease + loanCloseTotal + otherLoan + chargeReceivableTotal + partyReceivable;
        const allOutAmount = loanPaymentAmount + otherLoanInterest + otherLoanClose + chargeOutPayableTotal + expenseTotal + partyPayable;
        const netAmount = allInAmount - allOutAmount;

        const toFixed2 = num => Number(num).toFixed(2);

        res.json({
            success: true,
            allInAmount: toFixed2(allInAmount),
            allOutAmount: toFixed2(allOutAmount),
            netAmount: toFixed2(netAmount),
        });

    } catch (err) {
        console.error('Error in getTotalInOutAmount:', err);
        res.status(500).json({success: false, message: "Server error"});
    }
};

module.exports = {
    getAreaAndReferenceStats,
    getInquiryStatusSummary,
    getLoanAmountPerScheme,
    getAllLoanStatsWithCharges,
    getCompanyPortfolioSummary,
    getOtherLoanChart,
    getLoanChartData,
    getPaymentInOutSummary,
    getTotalInOutAmount
};