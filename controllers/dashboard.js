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
            const day = now.getDay();
            start.setDate(now.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_month':
            start.setMonth(now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;

        case 'last_3_months':
            start.setMonth(now.getMonth() - 3);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            break;

        case 'last_6_months':
            start.setMonth(now.getMonth() - 6);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
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
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setTime(now.getTime());
            break;

        case 'this_month':
        default:
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(now.getMonth() + 1, 0);
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
        const schemes = await Scheme.find({company: companyId, deleted_at: null});

        const schemeLoanStats = await IssuedLoan.aggregate([
            {
                $match: {
                    company: companyId,
                    deleted_at: null,
                    createdAt: {$gte: start, $lte: end}
                }
            },
            {
                $group: {
                    _id: "$scheme",
                    totalLoanAmount: {
                        $sum: {$add: ["$loanAmount", "$interestLoanAmount"]}
                    },
                    totalInterestAmount: {$sum: "$interestLoanAmount"}
                }
            }
        ]);

        let globalLoanTotal = 0;
        let totalInterestRate = 0;
        let interestRateCount = 0;

        const categories = [];
        const series = [{
            name: "Loan Amount",
            data: []
        }];

        const result = schemes.map(scheme => {
            const stat = schemeLoanStats.find(stat => String(stat._id) === String(scheme._id));
            const totalLoanAmount = stat ? stat.totalLoanAmount || 0 : 0;

            globalLoanTotal += totalLoanAmount;

            if (scheme.interestRate != null) {
                totalInterestRate += scheme.interestRate;
                interestRateCount += 1;
            }

            const interestLabel = scheme.interestRate != null ? ` (${scheme.interestRate}%)` : " (0%)";
            categories.push(`${scheme.name}${interestLabel}`);
            series[0].data.push(totalLoanAmount);

            return {
                schemeId: scheme._id,
                schemeName: scheme.name,
                totalLoanAmount,
                avgInterestRate: scheme.interestRate || 0
            };
        });

        const globalAvgInterestRate = interestRateCount > 0 ? (totalInterestRate / interestRateCount) : 0;

        res.status(200).json({
            success: true,
            data: result,
            global: {
                totalLoanAmount: globalLoanTotal,
                avgInterestRate: globalAvgInterestRate
            },
            chartData: {
                categories: categories,
                series: series
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

        const issuedLoans = await IssuedLoan.find({
            company: companyId,
            deleted_at: null,
            createdAt: {$gte: start, $lte: end},
            customer: {$in: customerIds}
        });

        const loanCloses = await LoanClose.find({
            deleted_at: null,
            date: {$gte: start, $lte: end}
        }).populate("loan");

        const filteredLoanCloses = loanCloses.filter(cl =>
            cl.loan &&
            cl.loan.company?.toString() === companyId &&
            cl.loan.customer &&
            customerIds.includes(cl.loan.customer.toString())
        );

        const consultingCharge = issuedLoans.reduce((sum, loan) => sum + (loan.consultingCharge || 0), 0);
        const approvalCharge = issuedLoans.reduce((sum, loan) => sum + (loan.approvalCharge || 0), 0);
        const closingChargeOutMain = filteredLoanCloses.reduce((sum, cl) => sum + (cl.closingCharge || 0), 0);
        const chargeInMain = consultingCharge + approvalCharge;

        const otherIssuedLoans = await OtherIssuedLoan.find({
            company: companyId,
            deleted_at: null,
            createdAt: {$gte: start, $lte: end},
            customer: {$in: customerIds}
        });

        const otherLoanCloses = await OtherLoanClose.find({
            deleted_at: null,
            payDate: {$gte: start, $lte: end}
        }).populate("otherLoan");

        const filteredOtherLoanCloses = otherLoanCloses.filter(cl =>
            cl.otherLoan &&
            cl.otherLoan.company?.toString() === companyId &&
            cl.otherLoan.customer &&
            customerIds.includes(cl.otherLoan.customer.toString())
        );

        const otherChargeIn = otherIssuedLoans.reduce((sum, loan) =>
            sum + (loan.closingCharge || 0) + (loan.otherCharge || 0), 0);

        const closingChargeOutOther = filteredOtherLoanCloses.reduce((sum, cl) => sum + (cl.closingCharge || 0), 0);

        const interestsMain = await Interest.find({
            createdAt: {$gte: start, $lte: end}
        }).populate('loan');

        const filteredInterestsMain = interestsMain.filter(i =>
            i.loan &&
            i.loan.company?.toString() === companyId &&
            i.loan.customer &&
            customerIds.includes(i.loan.customer.toString())
        );

        const interestInMain = filteredInterestsMain.reduce((sum, i) => sum + (i.interestAmount || 0), 0);

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
                loan.deleted_at == null &&
                loan.customer &&
                customerIds.includes(loan.customer.toString());
        });

        let interestOutOther = 0;
        for (const p of filteredInterestOutRecords) {
            const payment = p.paymentDetail || {};
            const cash = Number(payment.cashAmount) || 0;
            const bank = Number(payment.bankAmount) || 0;
            interestOutOther += cash + bank;
        }

        const chargeIn = chargeInMain + otherChargeIn;
        const chargeOut = closingChargeOutMain + closingChargeOutOther;
        const chargeDifference = chargeIn - chargeOut;
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

        const loanIds = issuedLoans.map(loan => loan._id.toString());

        const totalLoanPortfolio = issuedLoans.reduce((sum, loan) => sum + (loan.loanAmount || 0), 0);

        const now = new Date();
        const totalMonths = (now.getFullYear() - companyStartDate.getFullYear()) * 12 + (now.getMonth() - companyStartDate.getMonth()) + 1;

        const monthlyAveragePortfolio = totalMonths > 0
            ? totalLoanPortfolio / totalMonths
            : totalLoanPortfolio;

        const closedLoans = await LoanClose.find({
            deleted_at: null,
            loan: {$in: loanIds}
        });

        const totalClosedLoanAmount = closedLoans.reduce((sum, item) => {
            const closeCharge = Number(item?.closingCharge || 0);
            const netAmount = Number(item?.netAmount || 0);
            return sum + (netAmount - closeCharge);
        }, 0);

        res.json({
            success: true,
            data: {
                totalLoanPortfolio,
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

        const series = [
            buildChartData('Week', 'ddd', weekCategories),
            buildChartData('Month', 'MMM', monthCategories),
            buildChartData('Year', 'YYYY', yearCategories)
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

        const today = moment();
        const series = [];

        const timeConfigs = [
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

            const closedLoans = await LoanClose.find({
                [config.closeKey]: {$gte: config.start.toDate(), $lte: config.end.toDate()},
            }).populate({
                path: "loan",
                match: {company: companyId},
                select: "company loanAmount",
            });

            const filteredClosedLoans = closedLoans.filter((item) => item.loan != null);

            const groupData = (items, key, amountField, format) => {
                const grouped = {};
                items.forEach((item) => {
                    const label = moment(item[key]).format(format);
                    const amount = item[amountField] || 0;
                    grouped[label] = (grouped[label] || 0) + amount;
                });
                return config.categories.map((label) => grouped[label] || 0);
            };

            const newLoanData = groupData(issuedLoans, config.key, "loanAmount", config.groupFormat);
            const closeLoanData = groupData(filteredClosedLoans, config.closeKey, "netAmount", config.groupFormat);
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

module.exports = {
    getAreaAndReferenceStats,
    getInquiryStatusSummary,
    getLoanAmountPerScheme,
    getAllLoanStatsWithCharges,
    getCompanyPortfolioSummary,
    getOtherLoanChart,
    getLoanChartData
};