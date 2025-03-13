const moment = require("moment");
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
    return IssuedLoanModel.find(query)
        .populate({
            path: "customer",
            populate: "branch",
            match: branch ? {"branch._id": branch} : {},
        })
        .populate("scheme")
        .populate("closedBy")
        .populate("issuedBy")
        .sort({createdAt: -1})
        .lean();
};

const fetchInterestDetails = async (query, branch) => {
    return InterestModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "scheme"},
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    }).lean();
};

const fetchUchakInterestDetails = async (query, branch) => {
    return UchakInterestModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "scheme"},
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    }).lean();
};

const fetchPartPaymentDetails = async (query, branch) => {
    return PartPaymentModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    }).lean();
};

const fetchPartReleaseDetails = async (query, branch) => {
    return PartReleaseModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    }).lean();
};

const fetchLoanCloseDetails = async (query, branch) => {
    return CloseLoanModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    }).lean();
};

const dailyReport = async (req, res) => {
    try {
        const {companyId} = req.params;
        const {branch, date} = req.query;

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
            uchakInterestDetail,
            partPaymentDetail,
            partReleaseDetail,
        ] = await Promise.all([
            fetchInterestDetails({createdAt}, branch || null),
            fetchLoans(query, branch || null),
            fetchUchakInterestDetails({createdAt }, branch || null),
            fetchPartPaymentDetails({createdAt}, branch || null),
            fetchPartReleaseDetails({createdAt}, branch || null),
        ]);

        return res.status(200).json({
            status: 200,
            data: {
                interestDetail,
                loans,
                uchakInterestDetail,
                partPaymentDetail,
                partReleaseDetail,
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
        const { companyId } = req.params;

        const loans = await IssuedLoanModel.find({ company: companyId, deleted_at: null })
            .populate({ path: "customer", populate: "branch" }).populate("issuedBy")

        const result = await Promise.all(loans.map(async (loan) => {
            loan = loan.toObject(); // Convert Mongoose document to a plain object

            loan.closedDate = null;
            loan.closeAmt = 0;

            if (loan.status === 'Closed') {
                const closedLoans = await CloseLoanModel.find({ loan: loan._id, deleted_at: null })
                    .sort({ createdAt: -1 });

                if (closedLoans.length > 0) {
                    loan.closedDate = closedLoans[0].date;
                    loan.closeAmt = closedLoans.reduce((sum, entry) => sum + (entry.netAmount || 0), 0);
                }
            }

            // Fetch Interest and Part Payments
            const [interests, partPayments, partReleases] = await Promise.all([
                InterestModel.find({ loan: loan._id }).sort({ createdAt: -1 }),
                PartPaymentModel.find({ loan: loan._id }).sort({ createdAt: -1 }).limit(1),
                LoanPartReleaseModel.find({ loan: loan._id }).sort({ createdAt: -1 }).limit(1),
            ]);

            const lastInterestEntry = interests[0] || {};
            const oldCrDr = lastInterestEntry.cr_dr ?? 0;
            const totalPaidInterest = interests.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);

            // Determine Last Payment Date
            const lastAmtPayDate = Math.max(
                partPayments[0]?.createdAt || 0,
                partReleases[0]?.createdAt || 0
            ) || null;

            // Uchak Interest Calculation
            let uchakInterest = 0;
            if (lastInterestEntry.createdAt) {
                const uchakInterestData = await UchakInterestModel.aggregate([
                    { $match: { loan: loan._id, date: { $gte: lastInterestEntry.createdAt } } },
                    { $group: { _id: null, totalInterest: { $sum: "$amountPaid" } } }
                ]);
                uchakInterest = uchakInterestData.length > 0 ? uchakInterestData[0].totalInterest : 0;
            }

            // Interest & Penalty Calculation
            const today = moment();
            const lastInstallmentDate = moment(loan.lastInstallmentDate);
            const daysDiff = today.diff(lastInstallmentDate, 'days');

            loan.day = daysDiff;

            const interestRate = loan.scheme?.interestRate ?? 0;
            const interestAmount = ((loan.interestLoanAmount * (interestRate / 100)) * 12 * daysDiff) / 365;

            let pendingInterest = interestAmount - uchakInterest - oldCrDr;
            let penaltyAmount = 0;

            if (daysDiff > 30) {
                const penaltyDays = daysDiff - 30;
                const penaltyData = await PenaltyModel.findOne({
                    company: companyId,
                    afterDueDateFromDate: { $lte: penaltyDays },
                    afterDueDateToDate: { $gte: penaltyDays },
                }).select('penaltyInterest');

                const penaltyInterestRate = penaltyData?.penaltyInterest || 0;
                penaltyAmount = ((loan.interestLoanAmount * (penaltyInterestRate / 100)) * 12 * penaltyDays) / 365;

                pendingInterest += penaltyAmount;
            }

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
        const { companyId } = req.params;

        const loans = await OtherIssuedLoanModel.find({ company: companyId, deleted_at: null })
            .populate({ path: "loan", populate: [{path: "customer", select: "firstName middleName lastName"},{path:"scheme"}] })

        const result = await Promise.all(loans.map(async (loan) => {
            loan = loan.toObject();

            // Fetch Interest and Part Payments
            const [interests] = await Promise.all([
                OtherLoanInterestModel.find({ otherLoan: loan._id }).sort({ createdAt: -1 }),
            ]);

            const lastInterestEntry = interests[0] || {};
            loan.totalInterestAmt = interests.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);
            // Interest & Penalty Calculation
            const today = moment();
            const lastInstallmentDate = moment(loan.renewalDate);
            const daysDiff = today.diff(lastInstallmentDate, 'days');

            loan.day = daysDiff;

            const interestRate = loan.percentage

            loan.pendingInterest = ((loan.amount * (interestRate / 100)) * 12 * daysDiff) / 365;;

            return loan;
        }));

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
        const { loanId} = req.params;

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
            fetchInterestDetails(query,  null),
            fetchUchakInterestDetails(query ,  null),
            fetchPartPaymentDetails(query,  null),
            fetchPartReleaseDetails(query,  null),
            fetchLoanCloseDetails(query,  null),
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
        const { customerId } = req.params;

        // Fetch loan details
        const loanDetails = await IssuedLoanModel.find({ customer: customerId }).select('_id').lean();
        const loanIds = loanDetails.map(loan => loan._id);
        const query = { loan: { $in: loanIds }, deleted_at: null };

        // Fetch all relevant details in parallel
        const details = await Promise.all([
            fetchInterestDetails(query, null),
            fetchUchakInterestDetails(query, null),
            fetchPartPaymentDetails(query, null),
            fetchPartReleaseDetails(query, null),
            fetchLoanCloseDetails(query, null),
        ]);

        const types = [
            "Interest payment",
            "Uchak interest payment",
            "Loan part payment",
            "Loan part release",
            "Loan close",
        ];

        // Combine results and assign types
        const result = details.flatMap((detail, index) =>
            detail.map(entry => ({ ...entry, type: types[index] }))
        );

        const statementData = result.map(({ type, loan, paymentDetail, createdAt, interestLoanAmount }) => {
            const amount = (paymentDetail.paymentMode === 'Cash')
                ? Number(paymentDetail.cashAmount) || 0
                : (paymentDetail.paymentMode === 'Bank')
                    ? Number(paymentDetail.bankAmount) || 0
                    : Number(paymentDetail.cashAmount) + Number(paymentDetail.bankAmount) || 0;

            return {
                type,
                loanNo: loan.loanNo,
                customerName: `${loan.customer.firstName} ${loan.customer.lastName}`,
                loanAmount: loan.loanAmount,
                amount,
                interestLoanAmount: type === 'Interest payment' ? interestLoanAmount : interestLoanAmount - amount,
                partLoanAmount: loan.loanAmount - interestLoanAmount + amount,
                createdAt,
            };
        }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));


        return res.status(200).json({ status: 200, data: statementData });
    } catch (err) {
        console.error("Error fetching customer statement report:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
};


const initialLoanDetail = async (req,res) => {

    try {
        const loanDetail = await IssuedLoanInitialModel.find().populate('customer').populate("scheme");
        return res.status(200).json({
            status: 200,
            data: loanDetail
        })
    }catch (e){
        console.error("Error fetching loan detail report:",e.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        })
    }
}


module.exports = {dailyReport, loanSummary, loanDetail, customerStatement, initialLoanDetail, otherLoanSummary}
