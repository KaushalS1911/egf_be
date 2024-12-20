const IssuedLoanModel = require("../models/issued-loan")
const InterestModel = require("../models/interest")
const UchakInterestModel = require("../models/uchak-interest-payment")
const PartPaymentModel = require("../models/loan-part-payment")
const PartReleaseModel = require("../models/part-release")

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

        const query = {
            company: companyId,
            deleted_at: null,
            createdAt: {
                $gte: new Date(date),
                $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
            },
        };

        const [
            loans,
            interestDetail,
            uchakInterestDetail,
            partPaymentDetail,
            partReleaseDetail,
        ] = await Promise.all([
            fetchLoans(query, branch),
            fetchInterestDetails(query, branch),
            fetchUchakInterestDetails(query, branch),
            fetchPartPaymentDetails(query, branch),
            fetchPartReleaseDetails(query, branch),
        ]);

        return res.status(200).json({
            status: 200,
            data: {
                loans,
                interestDetail,
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

module.exports = {dailyReport};
