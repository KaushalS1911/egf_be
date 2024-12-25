const moment = require("moment");
const IssuedLoanModel = require("../models/issued-loan")
const InterestModel = require("../models/interest")
const UchakInterestModel = require("../models/uchak-interest-payment")
const PartPaymentModel = require("../models/loan-part-payment")
const PartReleaseModel = require("../models/part-release")
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
        .sort({createdAt: -1});
};

const fetchInterestDetails = async (query, branch) => {
    return InterestModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "scheme"},
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    });
};

const fetchUchakInterestDetails = async (query, branch) => {
    return UchakInterestModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "scheme"},
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    });
};

const fetchPartPaymentDetails = async (query, branch) => {
    return PartPaymentModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    });
};

const fetchPartReleaseDetails = async (query, branch) => {
    return PartReleaseModel.find(query).populate({
        path: "loan",
        populate: [
            {path: "customer", populate: {path: "branch"}, match: branch ? {'branch._id': branch} : {}},
        ],
    });
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
        const [
            interestDetail,
            loans,
            uchakInterestDetail,
            partPaymentDetail,
            partReleaseDetail,
        ] = await Promise.all([
            fetchInterestDetails(query, branch || null),
            fetchLoans(query, branch || null),
            fetchUchakInterestDetails(query, branch || null),
            fetchPartPaymentDetails(query, branch || null),
            fetchPartReleaseDetails(query, branch || null),
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
        const {companyId} = req.params;

        const query = {
            company: companyId,
            deleted_at: null,
        };

        const loans = await IssuedLoanModel.find(query).populate({path: "customer", populate: "branch"}).populate("issuedBy").populate('closedBy');

        const result = await Promise.all(loans.map(async (loan) => {
            const interests = await InterestModel.find({loan: loan._id}).select('amountPaid');

            const totalPaidInterest = interests.reduce((acc, interest) => acc + (interest.amountPaid || 0), 0);

            loan = loan.toObject();
            loan.totalPaidInterest = totalPaidInterest;

            const today = moment();
            const lastInstallmentDate = moment(loan.lastInstallmentDate);
            const daysDiff = today.diff(lastInstallmentDate, 'days');

            loan.day = daysDiff;

            let pendingInterest = 0;

            if (daysDiff > 30) {
                const penaltyDays = daysDiff - 30;

                const penaltyData = await PenaltyModel.findOne({
                    company: companyId,
                    afterDueDateFromDate: {$lte: penaltyDays},
                    afterDueDateToDate: {$gte: penaltyDays},
                }).select('penaltyInterest');

                const penaltyInterest = penaltyData?.penaltyInterest || 0;

                const penaltyAmount = ((loan.interestLoanAmount * (penaltyInterest / 100)) * 12 * penaltyDays / 365);

                const interestAmount = ((loan.interestLoanAmount * (loan.scheme.interestRate / 100)) * 12 * daysDiff / 365);

                pendingInterest = penaltyAmount + interestAmount;
            } else {
                pendingInterest = ((loan.interestLoanAmount * (loan.scheme.interestRate / 100)) * 12 * daysDiff / 365);
            }

            loan.pendingInterest = pendingInterest;

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


module.exports = {dailyReport, loanSummary};
