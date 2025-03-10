const moment = require("moment");
const IssuedLoanModel = require("../models/issued-loan")
const InterestModel = require("../models/interest")
const UchakInterestModel = require("../models/uchak-interest-payment")
const IssuedLoanInitialModel = require("../models/issued_loan_initial")
const PartPaymentModel = require("../models/loan-part-payment")
const PartReleaseModel = require("../models/part-release")
const CloseLoanModel = require("../models/loan-close")
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

const fetchLoanCloseDetails = async (query, branch) => {
    return CloseLoanModel.find(query).populate({
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
        const {companyId} = req.params;

        const query = {
            company: companyId,
            deleted_at: null,
        };

        const loans = await IssuedLoanModel.find(query).populate({path: "customer", populate: "branch"}).populate("issuedBy").populate('closedBy').populate("scheme");

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


const customerStatement = async (req,res) => {
    try {
        const { customerId } = req.params;

        const loanDetails = await IssuedLoanModel.find({customer: customerId}).select('_id')
        const loanIds = loanDetails.map((loan) => loan._id);
        const query = { loan: { $in: loanIds }, deleted_at: null }


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

        const result = [...interestDetail, ...uchakInterestDetail, ...partPaymentDetail, ...partReleaseDetail, ...loanCloseDetail];

        const statementData = result.map((item) => {
            return {
                loanNo: item.loan.loanNo,
                customerName: `${item.loan.customer.firstName} ${item.loan.customer.lastName}`,
                loanAmount: item.loan.loanAmount,
                interestLoanAmount: item.loan.interestLoanAmount,
                partLoanAmount: item.loan.loanAmount - item.loan.interestLoanAmount,
                amount:
                    item.paymentDetail.paymentMode === 'Cash'
                        ? item.paymentDetail.cashAmount
                        : item.paymentDetail.paymentMode === 'Bank'
                            ? item.paymentDetail.bankAmount
                            : item.paymentDetail.cashAmount + item.paymentDetail.bankAmount,
                createdAt: item.createdAt,
            };
        }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return res.status(200).json({
            status: 200,
            data: statementData,
        });
    } catch (err) {
        console.error("Error fetching customer statement report:", err.message);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
        });
    }
}

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


module.exports = {dailyReport, loanSummary, loanDetail, customerStatement, initialLoanDetail}
