const moment = require("moment");
const mongoose = require("mongoose");
const IssuedLoanModel = require("../models/issued-loan")
const InterestModel = require("../models/interest")
const UchakInterestModel = require("../models/uchak-interest-payment")
const IssuedLoanInitialModel = require("../models/issued_loan_initial")
const PartPaymentModel = require("../models/loan-part-payment")
const PartReleaseModel = require("../models/part-release")
const CloseLoanModel = require("../models/loan-close")
const LoanPartReleaseModel = require("../models/part-release")
const OtherIssuedLoanModel = require("../models/other-issued-loan")
const OtherCloseLoanModel = require("../models/other-loan-close")
const OtherLoanInterestModel = require("../models/other-loan-interest-payment")
const PenaltyModel = require("../models/penalty")

const fetchLoans = async (query, branch) => {
    const loans = await IssuedLoanModel.find(query)
        .populate({
            path: "customer",
            populate: "branch"
        })
        .populate("scheme")
        .populate("closedBy")
        .populate("issuedBy")
        .sort({createdAt: -1})
        .lean();

    return branch
        ? loans.filter(loan => loan?.customer?.branch?._id?.toString() === branch)
        : loans;
};

const fetchOtherLoans = async (query, branch) => {
    const otherLoans = await OtherIssuedLoanModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "customer", populate: "branch"},
                {path: "scheme"},
                {path: "closedBy"},
                {path: "issuedBy"}
            ],
        })
        .sort({createdAt: -1})
        .lean();

    return branch
        ? otherLoans.filter(item =>
            item?.loan?.customer?.branch?._id?.toString() === branch
        )
        : otherLoans;
};

const fetchOtherInterestDetails = async (query, company, branch) => {
    const otherLoanInterests = await OtherLoanInterestModel.find(query)
        .populate({
            path: "otherLoan",
            populate: {
                path: "loan",
                populate: [
                    {path: "customer", populate: "branch"},
                    {path: "scheme"},
                    {path: "closedBy"},
                    {path: "issuedBy"}
                ]
            }
        })
        .lean();

    let filtered = otherLoanInterests;
    if (company) {
        filtered = filtered.filter(ele => ele?.otherLoan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.otherLoan?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchOtherLoanCloseDetails = async (query, company, branch) => {
    const otherClosedLoans = await OtherCloseLoanModel.find(query)
        .populate({
            path: "otherLoan",
            populate: {
                path: "loan",
                populate: [
                    {path: "customer", populate: "branch"},
                    {path: "scheme"},
                    {path: "closedBy"},
                    {path: "issuedBy"}
                ]
            }
        })
        .lean();

    let filtered = otherClosedLoans;
    if (company) {
        filtered = filtered.filter(ele => ele?.otherLoan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.otherLoan?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchInterestDetails = async (query, company, branch) => {
    const interests = await InterestModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "scheme"},
                {path: "customer", populate: {path: "branch"}},
            ],
        })
        .lean();

    let filtered = interests;
    if (company) {
        filtered = filtered.filter(ele => ele?.loan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchUchakInterestDetails = async (query, company, branch) => {
    const uchakInterests = await UchakInterestModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "scheme"},
                {path: "customer", populate: {path: "branch"}},
            ],
        })
        .lean();

    let filtered = uchakInterests;
    if (company) {
        filtered = filtered.filter(ele => ele?.loan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchPartPaymentDetails = async (query, company, branch) => {
    const partPayments = await PartPaymentModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "scheme"},
                {path: "customer", populate: {path: "branch"}},
            ],
        })
        .lean();

    let filtered = partPayments;
    if (company) {
        filtered = filtered.filter(ele => ele?.loan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchPartReleaseDetails = async (query, company, branch) => {
    const partReleases = await PartReleaseModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "scheme"},
                {path: "customer", populate: {path: "branch"}},
            ],
        })
        .lean();

    let filtered = partReleases;
    if (company) {
        filtered = filtered.filter(ele => ele?.loan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const fetchLoanCloseDetails = async (query, company, branch) => {
    const closedLoans = await CloseLoanModel.find(query)
        .populate({
            path: "loan",
            populate: [
                {path: "customer", populate: {path: "branch"}},
            ],
        })
        .lean();

    let filtered = closedLoans;
    if (company) {
        filtered = filtered.filter(ele => ele?.loan?.company === company);
    }
    if (branch) {
        filtered = filtered.filter(ele =>
            ele?.loan?.customer?.branch?._id?.toString() === branch
        );
    }
    return filtered;
};

const dailyReport = async (req, res) => {
    try {
        const {companyId} = req.params;
        const {branchId = null, date} = req.query;

        if (!date)
            return res.status(400).json({status: 400, message: "Missing 'date' parameter"});

        const [day, month, year] = date.split('/');
        const parsedDate = new Date(`${year}-${month}-${day}T00:00:00`);
        if (isNaN(parsedDate))
            return res.status(400).json({status: 400, message: "Invalid date format (dd/mm/yyyy)"});

        const nextDate = new Date(parsedDate);
        nextDate.setDate(parsedDate.getDate() + 1);

        const createdAt = {$gte: parsedDate, $lt: nextDate};
        const query = {company: companyId, deleted_at: null, createdAt};

        const data = await Promise.all([
            fetchInterestDetails({createdAt}, companyId, branchId),
            fetchLoans(query, branchId),
            fetchUchakInterestDetails({createdAt}, companyId, branchId),
            fetchPartPaymentDetails({createdAt}, companyId, branchId),
            fetchPartReleaseDetails({createdAt}, companyId, branchId),
            fetchLoanCloseDetails({createdAt}, companyId, branchId),
        ]);

        const [
            interestDetail, loans, uchakInterestDetail,
            partPaymentDetail, partReleaseDetail, closedLoans
        ] = data;

        return res.status(200).json({
            status: 200,
            data: {
                interestDetail,
                loans,
                uchakInterestDetail,
                partPaymentDetail,
                partReleaseDetail,
                closedLoans
            },
        });
    } catch (err) {
        console.error("Error fetching daily report:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
};

const dailyOtherLoanReport = async (req, res) => {
    try {
        const {companyId} = req.params;
        const {date} = req.query;

        if (!date || isNaN(new Date(date))) {
            return res.status(400).json({
                status: 400,
                message: "Invalid or missing 'date' parameter",
            });
        }

        const query = {
            company: companyId,
            deleted_at: null,
            createdAt: {
                $gte: new Date(date),
                $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
            },
        };

        const {createdAt} = query

        const [
            interestDetail,
            loans,
            closedLoanDetails,
        ] = await Promise.all([
            fetchOtherInterestDetails({createdAt}, companyId),
            fetchOtherLoans(query),
            fetchOtherLoanCloseDetails({createdAt}, companyId),
        ]);

        return res.status(200).json({
            status: 200,
            data: {
                interestDetail,
                loans,
                closedLoanDetails,
            },
        });
    } catch (err) {
        console.error("Error fetching daily report:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
};

const loanSummary = async (req, res) => {
    try {
        const {companyId} = req.params;

        const loans = await IssuedLoanModel.find({company: companyId, deleted_at: null}).sort({loanNo: 1})
            .populate({
                path: "customer",
                populate: "branch"
            }).populate("issuedBy").populate("scheme").populate("closedBy")

        const result = await Promise.all(loans.map(async (loan) => {
            loan = loan.toObject();

            loan.closedDate = null;
            loan.closeAmt = 0;
            loan.closeCharge = 0

            if (loan.status === 'Closed') {
                const closedLoans = await CloseLoanModel.find({loan: loan._id, deleted_at: null})
                    .sort({createdAt: -1});

                if (closedLoans.length > 0) {
                    loan.closeCharge = closedLoans[0].closingCharge
                    loan.closedDate = closedLoans[0].date;
                    loan.closeAmt = closedLoans.reduce((sum, entry) => sum + (entry.netAmount || 0), 0);
                }
            }


            const [interests, partPayments, partReleases] = await Promise.all([
                InterestModel.find({loan: loan._id}).sort({createdAt: -1}),
                PartPaymentModel.find({loan: loan._id}).sort({createdAt: -1}).limit(1),
                LoanPartReleaseModel.find({loan: loan._id}).sort({createdAt: -1}).limit(1),
            ]);

            const lastInterestEntry = interests[0] || {};
            const oldCrDr = lastInterestEntry.cr_dr ?? 0;
            const totalPaidInterest = interests.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);

            const lastAmtPayDate = Math.max(
                partPayments[0]?.createdAt || 0,
                partReleases[0]?.createdAt || 0
            ) || null;

            let uchakInterest = 0;
            if (lastInterestEntry.createdAt) {
                const uchakInterestData = await UchakInterestModel.aggregate([
                    {$match: {loan: loan._id, date: {$gte: lastInterestEntry.createdAt}}},
                    {$group: {_id: null, totalInterest: {$sum: "$amountPaid"}}}
                ]);
                uchakInterest = uchakInterestData.length > 0 ? uchakInterestData[0].totalInterest : 0;
            }

            const today = moment().startOf('day');
            const lastInstallmentDate = interests?.length !== 0 ? moment(loan.lastInstallmentDate).startOf('day') : moment(loan.issueDate).startOf('day');
            const daysDiff = interests?.length !== 0 ? today.diff(lastInstallmentDate, 'days') : today.diff(lastInstallmentDate, 'days') + 1;

            let penaltyDayDiff = today.diff(
                moment(interests && interests.length ? loan.lastInstallmentDate : loan.nextInstallmentDate),
                'days'
            );

            loan.day = interests.reduce((sum, entry) => sum + (Number(entry.days) || 0), 0);
            loan.pendingDays = loan.status === 'Closed' ? interests.reduce((sum, ele) => sum + (Number(ele.days) || 0), 0) : daysDiff;

            const interestRate = loan.scheme?.interestRate ?? 0;
            const interestAmount = ((loan.interestLoanAmount * (interestRate / 100)) * 12 * daysDiff) / 365;

            let pendingInterest = loan.status === 'Closed' ? 0 : interestAmount - uchakInterest + oldCrDr;
            let penaltyAmount = 0;

            const penaltyDays = penaltyDayDiff
            const penaltyData = await PenaltyModel.findOne({
                company: companyId,
                afterDueDateFromDate: {$lte: penaltyDays},
                afterDueDateToDate: {$gte: penaltyDays},
            }).select('penaltyInterest');

            const penaltyInterestRate = penaltyData?.penaltyInterest || 0;
            penaltyAmount = loan.status === 'Closed' ? 0 : ((loan.interestLoanAmount * (penaltyInterestRate / 100)) * 12 * daysDiff) / 365;
            pendingInterest += penaltyAmount;

            loan.pendingInterest = pendingInterest;
            loan.penaltyAmount = penaltyAmount;
            loan.totalPaidInterest = totalPaidInterest;
            loan.lastAmtPayDate = lastAmtPayDate;

            return loan;
        }));

        return res.status(200).json({
            message: "Report data fetched successfully",
            data: result,
        });

    } catch (error) {
        console.error("Error fetching loan summary:", error);
        return res.status(500).json({
            message: "An error occurred while fetching the report data.",
            error: error.message,
        });
    }
};

const otherLoanSummary = async (req, res) => {
    try {
        const {companyId} = req.params;

        const loans = await OtherIssuedLoanModel.find({company: companyId, deleted_at: null})
            .populate({
                path: "loan",
                populate: [
                    {path: "customer", select: "firstName middleName lastName"},
                    {path: "scheme"}
                ]
            });

        const result = await Promise.all(loans.map(async (loan) => {
            loan = loan.toObject();

            const interestPayments = await OtherLoanInterestModel.find({otherLoan: loan._id}).sort({createdAt: -1});

            loan.totalInterestAmt = interestPayments.reduce((sum, entry) => sum + (entry.payAfterAdjust || 0), 0);
            loan.totalCharge = interestPayments.reduce((sum, entry) => sum + (entry.charge || 0), 0);

            const today = moment();
            const lastInstallmentDate = interestPayments.length !== 0 ? moment(interestPayments[0].to) : moment(loan.date);
            const daysDiff = today.diff(lastInstallmentDate, 'days') + 1;

            loan.day = interestPayments.reduce((sum, entry) => sum + (Number(entry.days) || 0), 0);
            loan.pendingDay = loan.status === 'Closed' ? 0 : daysDiff;

            const interestRate = loan.percentage;
            loan.pendingInterest = loan.status === 'Closed'
                ? 0
                : ((loan.amount * (interestRate / 100)) * 12 * daysDiff) / 365;

            return loan;
        }));

        result.sort((a, b) => {
            const aNum = a.loan.loanNo || '';
            const bNum = b.loan.loanNo || '';
            return aNum.localeCompare(bNum, undefined, {numeric: true, sensitivity: 'base'});
        });

        return res.status(200).json({
            message: "Report data of other loan summary fetched successfully",
            data: result,
        });

    } catch (error) {
        console.error("Error fetching loan summary:", error);
        return res.status(500).json({
            message: "An error occurred while fetching the report data.",
            error: error.message,
        });
    }
};

const loanDetail = async (req, res) => {
    try {
        const {loanId, companyId} = req.params;

        const query = {
            loan: loanId,
        };

        const [
            interestDetail,
            uchakInterestDetail,
            partPaymentDetail,
            partReleaseDetail,
            loanCloseDetail
        ] = await Promise.all([
            fetchInterestDetails(query, companyId, null),
            fetchUchakInterestDetails(query, companyId, null),
            fetchPartPaymentDetails(query, companyId, null),
            fetchPartReleaseDetails(query, companyId, null),
            fetchLoanCloseDetails(query, companyId, null),
        ]);

        return res.status(200).json({
            status: 200,
            data: {
                interestDetail,
                uchakInterestDetail,
                partPaymentDetail,
                partReleaseDetail,
                loanCloseDetail
            },
        });
    } catch (err) {
        console.error("Error fetching daily report:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
}

const customerStatement = async (req, res) => {
    try {
        const {companyId, customerId} = req.params;

        const issuedLoans = await IssuedLoanModel.find({customer: customerId, deleted_at: null})
            .select('loanNo loanAmount issueDate _id');

        const groupedStatements = {};

        for (const loan of issuedLoans) {
            const loanId = String(loan._id);
            const query = {loan: loanId, deleted_at: null};

            const [partPayments, partReleases, loanCloses] = await Promise.all([
                fetchPartPaymentDetails(query, companyId, null),
                fetchPartReleaseDetails(query, companyId, null),
                fetchLoanCloseDetails(query, companyId, null),
            ]);

            const [interestPayments, uchakInterestPayments] = await Promise.all([
                fetchInterestDetails(query, companyId, null),
                fetchUchakInterestDetails(query, companyId, null),
            ]);

            const intStatements = [...interestPayments, ...uchakInterestPayments].map(e => ({
                date: e?.entryDate ?? e?.createdAt,
                detail: e.to ? 'Interest Payment' : 'Uchak Int Payment',
                debit: e?.amountPaid,
                credit: 0,
                loanNo: loan.loanNo
            }));

            const types = [
                {label: "Loan Part Payment", data: partPayments},
                {label: "Loan Part Release", data: partReleases},
                {label: "Loan Close", data: loanCloses}
            ];

            const result = types.flatMap(type =>
                type.data.map(entry => ({
                    date: entry.date,
                    debit: entry.amountPaid || entry.paymentDetail.bankAmount || entry.paymentDetail.cashAmount,
                    credit: 0,
                    loanNo: loan.loanNo,
                    detail: type.label
                }))
            );

            result.unshift({
                date: loan.issueDate,
                debit: 0,
                credit: loan.loanAmount,
                loanNo: loan.loanNo,
                detail: "Loan Issued"
            });

            const fullStatement = [...result, ...intStatements].sort(
                (a, b) => new Date(a.date) - new Date(b.date)
            );

            let balance = 0;
            const statementWithBalance = fullStatement.map(entry => {
                balance += (entry.credit || 0) - (entry.debit || 0);
                return {
                    ...entry,
                    balance
                };
            });

            groupedStatements[loanId] = {
                loanNo: loan.loanNo,
                statements: statementWithBalance
            };
        }

        return res.status(200).json({
            status: 200,
            data: groupedStatements
        });

    } catch (err) {
        console.error("Error fetching customer statement report:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
};

const initialLoanDetail = async (req, res) => {
    try {
        const {companyId} = req.params;

        const loans = await IssuedLoanInitialModel.find({company: companyId})
            .populate({
                path: 'customer',
                populate: {
                    path: 'branch',
                },
            })
            .populate('scheme');

        const result = await Promise.all(
            loans.map(async (loan) => {
                loan = loan.toObject();

                const interests = await InterestModel.find({loan: loan.loan}).sort({createdAt: -1});

                return {...loan, interests};
            })
        );

        return res.status(200).json({
            status: 200,
            data: result,
        });
    } catch (e) {
        console.error('Error fetching loan detail report:', e.message);
        return res.status(500).json({
            status: 500,
            message: 'Internal server error',
        });
    }
};

const allInOutReport = async (req, res) => {
    try {
        const {companyId} = req.params;

        const customerLoans = await IssuedLoanModel.find({
            company: companyId,
            deleted_at: null
        }).populate([{path: "customer", select: "firstName middleName lastName"}, {path: "scheme"}])

        const otherLoans = await OtherIssuedLoanModel.find({company: companyId, deleted_at: null})
            .populate({
                path: "loan",
                populate: [{path: "customer", select: "firstName middleName lastName"}, {path: "scheme"}]
            })

        const result = await Promise.all(otherLoans.map(async (loan) => {
            loan = loan.toObject();

            const [customerLoanInterests, interests] = await Promise.all([
                InterestModel.find({loan: loan.loan._id, deleted_at: null}),
                OtherLoanInterestModel.find({otherLoan: loan._id}).sort({createdAt: -1}),
            ]);

            loan.totalInterestAmount = customerLoanInterests.reduce((sum, amount) => sum + (amount.amountPaid || 0), 0)
            loan.totalOtherInterestAmount = interests.reduce((sum, entry) => sum + (entry.payAfterAdjust || 0), 0);

            const today = moment();
            const lastInstallmentDate = moment(loan.renewalDate);
            const daysDiff = today.diff(lastInstallmentDate, 'days') + 1;

            loan.day = daysDiff;

            const interestRate = loan.percentage

            loan.pendingInterest = ((loan.amount * (interestRate / 100)) * 12 * daysDiff) / 365;

            return loan;
        }));

        const resultMap = new Map();

        result.forEach(i => {
            const loanId = i?.loan?._id?.toString();
            if (loanId) {
                if (!resultMap.has(loanId)) {
                    resultMap.set(loanId, []);
                }
                resultMap.get(loanId).push(i);
            }
        });

        const totalLoans = await Promise.all(customerLoans.map(async (item) => {
            const foundLoans = resultMap.get(item?._id.toString());

            if (foundLoans) {
                return foundLoans;
            } else {
                const interests = await InterestModel.find({loan: item?._id, deleted_at: null});

                return {
                    loan: item,
                    otherNumber: '',
                    otherName: '',
                    otherLoanAmount: 0,
                    amount: 0,
                    percentage: 0,
                    rate: 0,
                    totalInterestAmount: interests.reduce((sum, amount) => sum + (amount.amountPaid || 0), 0),
                    date: null,
                    grossWt: 0,
                    netWt: 0,
                    totalOtherInterestAmount: 0,
                    status: ''
                };
            }
        }));

        const finalLoans = totalLoans.flat();

        const groupedByLoanData = finalLoans.reduce((grouped, loan) => {
            const loanId = loan?.loan?._id.toString();

            if (!grouped[loanId]) {
                grouped[loanId] = [];
            }

            grouped[loanId].push(loan);
            return grouped;
        }, {});

        return res.status(200).json({
            message: "Report data of other loan summary fetched successfully",
            data: groupedByLoanData,
        });

    } catch (error) {
        console.error("Error fetching loan summary:", error);
        return res.status(500).json({
            message: "An error occurred while fetching the report data.",
            error: error.message,
        });
    }
}

const interestEntryReport = async (req, res) => {
    const {companyId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    try {
        const entries = await InterestModel.find()
            .populate({
                path: "loan",
                match: {company: companyId},
                populate: [
                    {path: "company"},
                    {path: "customer"},
                    {path: "scheme"},
                ]
            })
            .exec();

        const filteredEntries = entries.filter(entry => entry.loan !== null);

        res.status(200).json({success: true, data: filteredEntries});
    } catch (error) {
        console.error("Error fetching interest entries:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
};

const interestEntryReportForOtherLoan = async (req, res) => {
    const {companyId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return res.status(400).json({success: false, message: "Invalid company ID"});
    }

    try {
        const entries = await OtherLoanInterestModel.find()
            .populate({
                path: "otherLoan",
                match: {company: companyId},
                populate: [
                    {path: "company"},
                    {path: "loan"},
                ]
            })
            .exec();

        const filteredEntries = entries.filter(entry => entry.otherLoan !== null);

        res.status(200).json({success: true, data: filteredEntries});
    } catch (error) {
        console.error("Error fetching other loan interest entries:", error);
        res.status(500).json({success: false, message: "Server error"});
    }
};

module.exports = {
    dailyReport,
    loanSummary,
    loanDetail,
    customerStatement,
    initialLoanDetail,
    otherLoanSummary,
    dailyOtherLoanReport,
    allInOutReport,
    interestEntryReport,
    interestEntryReportForOtherLoan
}
