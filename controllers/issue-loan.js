const IssuedLoanModel = require("../models/issued-loan");
const IssuedLoanInitialModel = require("../models/issued_loan_initial");
const InterestModel = require("../models/interest");
const PartReleaseModel = require("../models/part-release");
const PartPaymentModel = require("../models/loan-part-payment");
const LoanCloseModel = require("../models/loan-close");
const UchakInterestModel = require("../models/uchak-interest-payment");
const mongoose = require('mongoose')
const {uploadPropertyFile} = require("../helpers/avatar");
const {sendMessage} = require("./common");
const {generateNextLoanNumber} = require("../helpers/loan");
const moment = require("moment");

async function issueLoan(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {companyId} = req.params;
        const {issueDate, series, ...loanData} = req.body;

        const propertyImage = req.file?.buffer ? await uploadPropertyFile(req.file.buffer) : null;
        const loanNo = await generateNextLoanNumber(series, companyId);
        const transactionNo = await generateTransactionNumber(companyId);
        const nextInstallmentDate = getNextInterestPayDate(issueDate);

        const loanDetails = {
            ...loanData,
            issueDate,
            company: companyId,
            nextInstallmentDate,
            loanNo,
            transactionNo,
            propertyImage,
        };

        const issuedLoan = new IssuedLoanModel(loanDetails);
        const issuedLoanInitial = new IssuedLoanInitialModel(loanDetails);

        await Promise.all([
            issuedLoan.save({ session }),
            issuedLoanInitial.save({ session }),
        ]);

        await session.commitTransaction();
        return res.status(201).json({
            status: 201,
            message: "Loan issued successfully",
            data: issuedLoan,
        });
    } catch (err) {
        await session.abortTransaction();
        console.error("Error issuing loan:", err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    } finally {
        session.endSession();
    }
}


async function disburseLoan(req, res) {
    try {
        const {
            loan,
            companyBankDetail,
            bankAmount,
            cashAmount,
            pendingBankAmount,
            pendingCashAmount,
            payingCashAmount,
            payingBankAmount,
            issueDate
        } = req.body;

        // Fetch loan details
        const loanDetail = await IssuedLoanModel.findById(loan);
        if (!loanDetail) {
            return res.status(404).json({ status: 404, message: "Loan not found" });
        }

        // Update loan details
        Object.assign(loanDetail, {
            status: "Disbursed",
            companyBankDetail: companyBankDetail || loanDetail.companyBankDetail,
            cashAmount,
            bankAmount,
            pendingCashAmount,
            pendingBankAmount,
            payingCashAmount,
            payingBankAmount,
            issueDate,
            nextInstallmentDate: getNextInterestPayDate(issueDate)
        });
        // Save updated loan details
        const disbursedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loan,
            loanDetail,
            { new: true }
        ).populate(["scheme", "customer", "company"]);
        console.log(disbursedLoan)

        if (!disbursedLoan) {
            return res.status(500).json({ status: 500, message: "Failed to update loan details" });
        }

        // Send notification
        await sendMessage({
            type: "loan_issue",
            firstName: disbursedLoan?.customer?.firstName,
            middleName: disbursedLoan?.customer?.middleName,
            lastName: disbursedLoan?.customer?.lastName,
            contact: disbursedLoan.customer.contact,
            loanNo: disbursedLoan.loanNo,
            loanAmount: disbursedLoan.loanAmount,
            interestRate: disbursedLoan.scheme.interestRate,
            consultingCharge: disbursedLoan.consultingCharge || 0,
            issueDate: moment(disbursedLoan.issueDate, 'DD-MM-YYYY').format(),
            nextInstallmentDate: moment(disbursedLoan.nextInstallmentDate, 'DD-MM-YYYY').format(),
            companyContact: disbursedLoan.company.contact,
            companyName: disbursedLoan?.company?.name,
            companyEmail: disbursedLoan?.company?.email,
        });

        return res.status(201).json({ status: 201, message: "Loan disbursed successfully", data: disbursedLoan });
    } catch (err) {
        console.error("Error in disburseLoan:", err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}


async function interestPayment(req, res) {
    try {
        const {loanId} = req.params;
        const {uchakInterestAmount, amountPaid, to, from} = req.body;

        const [loanDetails] = await Promise.all([
            IssuedLoanModel.findById(loanId),
        ]);
        if (!loanDetails) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        const {nextInstallmentDate, lastInstallmentDate, isUpdated} = calculateInstallmentDates(
            loanDetails,
            from,
            to,
        );

        const interestDetail = await InterestModel.create({
            loan: loanId,
            isUpdated,
            amountPaid: amountPaid + uchakInterestAmount,
            ...req.body,
        });
        //

        await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {
                nextInstallmentDate,
                lastInstallmentDate,
                uchakInterestAmount: loanDetails.uchakInterestAmount - uchakInterestAmount,
            },
            {new: true}
        );

        return res.status(201).json({
            status: 201,
            message: "Loan interest paid successfully",
            data: interestDetail,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

function calculateInstallmentDates(loanDetails, from, to) {
    let isUpdated = true
    const nextInstallmentDate = getNextInterestPayDate(new Date(new Date(loanDetails.nextInstallmentDate).setDate(new Date(loanDetails.nextInstallmentDate).getDate() + 1)));
    const lastInstallmentDate = new Date(to);


    let isWithinInstallmentPeriod

    if (loanDetails.lastInstallmentDate) {
        isWithinInstallmentPeriod = (new Date(loanDetails.lastInstallmentDate).toDateString() === new Date(new Date(from).setDate(new Date(from).getDate() - 1)).toDateString()) && (new Date(loanDetails.nextInstallmentDate) > new Date(to))
    } else {
        isWithinInstallmentPeriod = (new Date(loanDetails.nextInstallmentDate) > new Date(to))
    }

    if (isWithinInstallmentPeriod) {
        isUpdated = false
    }

    return {
        nextInstallmentDate: isWithinInstallmentPeriod
            ? loanDetails.nextInstallmentDate
            : nextInstallmentDate,
        lastInstallmentDate,
        isUpdated
    };
}


function calculateUpdatedUchakAmount(uchakInterestAmount, amountPaid) {
    if (uchakInterestAmount && uchakInterestAmount > 0) {
        return Math.max(uchakInterestAmount - amountPaid, 0);
    }
    return 0;
}


async function deleteInterestPayment(req, res) {
    try {
        const {loanId, id} = req.params;

        // Fetch necessary details
        let [interestDetails, loanDetails] = await Promise.all([
            InterestModel.findById(id),
            IssuedLoanModel.findById(loanId),
        ]);

        if (!interestDetails || !loanDetails) {
            return res.status(404).json({status: 404, message: "Loan or Interest details not found"});
        }

        // Determine next installment date
        let nextInstallmentDate = calculateNextInstallmentDate(loanDetails, interestDetails);

        // Update the loan with adjusted installment dates
        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {
                uchakInterestAmount: interestDetails.uchakInterestAmount,
                nextInstallmentDate,
                lastInstallmentDate: new Date(new Date(interestDetails.from).setDate(new Date(interestDetails.from).getDate() - 1)) || null,
            },
            {new: true}
        );

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Loan not found during update"});
        }

        // Delete the interest entry
        const deletedInterestDetail = await InterestModel.findByIdAndDelete(id);
        if (!deletedInterestDetail) {
            return res.status(404).json({status: 404, message: "Interest payment not found during deletion"});
        }

        return res.status(200).json({
            status: 200,
            message: "Loan interest details deleted successfully",
            data: deletedInterestDetail,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


function calculateNextInstallmentDate(loanDetails, interestDetails) {
    // const isSingleInterestEntry = interestEntries && interestEntries.length === 1;

    if (interestDetails.isUpdated) {
        return reverseNextInterestPayDate(loanDetails.nextInstallmentDate);
    } else {
        return loanDetails.nextInstallmentDate
    }

    // const isWithinInstallmentPeriod =
    //     // new Date(new Date(loanDetails.lastInstallmentDate).setDate(new Date(loanDetails.lastInstallmentDate).getDate() + 1)).toDateString() ===
    //     // new Date(interestDetails.from).toDateString() &&
    //     new Date(loanDetails.lastInstallmentDate) > new Date(interestDetails.to);
    //
    // if (isWithinInstallmentPeriod) {
    //     return loanDetails.nextInstallmentDate;
    // }
    // return reverseNextInterestPayDate(new Date(new Date(loanDetails.nextInstallmentDate).setDate(new Date(loanDetails.nextInstallmentDate).getDate() - 1)));
}


async function loanClose(req, res) {
    try {
        const {loanId} = req.params

        const closedLoan = await LoanCloseModel.create({
            loan: loanId,
            ...req.body
        })

        const loanDetail = await IssuedLoanModel.findById(loanId)

        loanDetail.status = "Closed"
        loanDetail.interestLoanAmount = 0
        loanDetail.closedBy = req.body.closedBy

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, loanDetail, {new: true}).populate([{path: "scheme"}, {path: "customer"}, {path: "company"}]);

        return res.status(201).json({
            status: 201,
            message: "Loan closed successfully",
            data: {...closedLoan.toObject(), loan: updatedLoan}
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function uchakInterestPayment(req, res) {
    try {
        const {loanId} = req.params
        const loanDetails = await IssuedLoanModel.findById(loanId)
        const interestDetail = await UchakInterestModel.create({
            loan: loanId,
            ...req.body
        })

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, {uchakInterestAmount: loanDetails.uchakInterestAmount + req.body.amountPaid}, {new: true}).populate([{path: "scheme"}, {path: "customer"}, {path: "company"}]);

        return res.status(201).json({
            status: 201,
            message: "Loan uchak interest paid successfully",
            data: {...interestDetail.toObject(), loan: updatedLoan}
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateInterestPayment(req, res) {
    try {
        const {loanId, interestId} = req.params

        const updatedInterestDetail = await InterestModel.findByIdAndUpdate(interestId, req.body, {new: true})

        const lastInstallmentDate = new Date(req.body.to)

        await IssuedLoanModel.findByIdAndUpdate(loanId, {lastInstallmentDate}, {new: true})

        return res.status(201).json({
            status: 201,
            message: "Loan interest details updated successfully",
            data: updatedInterestDetail
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetInterestPayment(req, res) {

    try {
        const {loanId} = req.params

        const interestDetail = await InterestModel.find({
            loan: loanId,
            deleted_at: null
        }).sort({createdAt: -1}).populate({
            path: "loan",
            populate: [{path: "scheme"}, {path: "customer", populate: {path: "branch"}}, {path: "company"}]
        });

        return res.status(200).json({status: 200, data: interestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function InterestReports(req, res) {
    try {
        const companyId = req.params.companyId
        const interestDetail = await InterestModel.aggregate([
            {
                $match: {deleted_at: null}
            },
            {
                $group: {
                    _id: "$loan",
                    totalInterestAmount: {$sum: "$interestAmount"},
                    totalPenalty: {$sum: "$penalty"},
                    totalAmountPaid: {$sum: "$amountPaid"},
                    totalConsultingCharge: {$sum: "consultingCharge"}
                }
            },
            {
                $addFields: {
                    loanId: {$convert: {input: "$_id", to: "objectId"}}
                }
            },
            {
                $lookup: {
                    from: "issued loans",
                    localField: "loanId",
                    foreignField: "_id",
                    as: "loanDetails"
                }
            },
            {
                $unwind: {path: "$loanDetails", preserveNullAndEmptyArrays: true}
            },
            {
                $match: { "loanDetails.company": companyId , deleted_at: null}
            },
            {
                $addFields: {
                    "loanDetails.scheme": {
                        $convert: {input: "$loanDetails.scheme", to: "objectId", onError: null, onNull: null}
                    }
                }
            },
            {
                $lookup: {
                    from: "schemes",
                    localField: "loanDetails.scheme",
                    foreignField: "_id",
                    as: "loanDetails.scheme"
                }
            },
            {$unwind: {path: "$loanDetails.scheme", preserveNullAndEmptyArrays: true}},

            {
                $addFields: {
                    "loanDetails.customer": {
                        $convert: {input: "$loanDetails.customer", to: "objectId", onError: null, onNull: null}
                    }
                }
            },
            {
                $lookup: {
                    from: "customers",
                    localField: "loanDetails.customer",
                    foreignField: "_id",
                    as: "loanDetails.customer"
                }
            },
            {$unwind: {path: "$loanDetails.customer", preserveNullAndEmptyArrays: true}},

            {
                $addFields: {
                    "loanDetails.customer.branch": {
                        $convert: {input: "$loanDetails.customer.branch", to: "objectId", onError: null, onNull: null}
                    }
                }
            },
            {
                $lookup: {
                    from: "branches",
                    localField: "loanDetails.customer.branch",
                    foreignField: "_id",
                    as: "loanDetails.customer.branch"
                }
            },
            {$unwind: {path: "$loanDetails.customer.branch", preserveNullAndEmptyArrays: true}},

            {
                $sort: {_id: -1}
            }
        ]);


        return res.status(200).json({
            status: 200,
            data: interestDetail
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function GetUchakInterestPayment(req, res) {

    try {
        const {loanId} = req.params

        const interestDetail = await UchakInterestModel.find({
            loan: loanId,
        }).sort({createdAt: -1}).populate({
            path: "loan",
            populate: [{path: "scheme"}, {path: "customer", populate: {path: "branch"}}]
        });

        return res.status(200).json({status: 200, data: interestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteUchakInterestPayment(req, res) {

    try {
        const {loanId, id} = req.params

        let [interestDetails, loanDetails] = await Promise.all([
            UchakInterestModel.findById(id),
            IssuedLoanModel.findById(loanId),
        ]);

        const interestDetail = await UchakInterestModel.findById(id)

        await IssuedLoanModel.findByIdAndUpdate(loanId, {uchakInterestAmount: loanDetails.uchakInterestAmount - interestDetails.amountPaid})

        await UchakInterestModel.findByIdAndDelete(id)

        return res.status(200).json({status: 200, data: interestDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetPartPaymentDetail(req, res) {

    try {
        const {loanId} = req.params

        const paymentDetail = await PartPaymentModel.find({
            loan: loanId,
            deleted_at: null
        }).populate({
            path: "loan",
            populate: [{path: "scheme"}, {path: "customer", populate: {path: "branch"}}]
        })

        return res.status(200).json({status: 200, data: paymentDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetPartReleaseDetail(req, res) {

    try {
        const {loanId} = req.params

        const partReleaseDetail = await PartReleaseModel.find({
            loan: loanId,
            deleted_at: null
        }).populate({
            path: "loan",
            populate: [{path: "scheme"}, {path: "customer", populate: {path: "branch"}}, {path: "company"}]
        }).sort({createdAt: -1})

        return res.status(200).json({status: 200, data: partReleaseDetail});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function GetClosedLoanDetails(req, res) {

    try {
        const {loanId} = req.params

        const closedLoanDetails = await LoanCloseModel.find({
            loan: loanId,
            deleted_at: null
        }).populate({
            path: "loan",
            populate: [{path: "scheme"}, {path: "customer", populate: {path: "branch"}}, {path: "company"}]
        })

        return res.status(200).json({status: 200, data: closedLoanDetails});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updatePartReleaseDetail(req, res) {

    try {
        const {loanId, partId} = req.params

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount totalAmount')

        let {interestLoanAmount} = loanDetails

        interestLoanAmount = interestLoanAmount - req.body.amountPaid

        const nextInstallmentDate = getNextInterestPayDate(new Date())

        await IssuedLoanModel.findByIdAndUpdate(loanId, {nextInstallmentDate, interestLoanAmount}, {new: true})

        const updatedPartReleaseDetail = await PartReleaseModel.findByIdAndUpdate(partId, req.body, {new: true})

        return res.status(200).json({
            status: 200,
            message: "Part release details updated successfully",
            data: updatedPartReleaseDetail
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function loanPartPayment(req, res) {
    try {
        const {loanId} = req.params;
        const {amountPaid} = req.body;

        const partPaymentDetail = await PartPaymentModel.create({
            loan: loanId,
            ...req.body,
        });

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount totalAmount');
        if (!loanDetails) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        const updatedInterestLoanAmount = Math.max(loanDetails.interestLoanAmount - amountPaid, 0);

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {interestLoanAmount: updatedInterestLoanAmount},
            {new: true}
        ).populate([{path: "scheme"}, {path: "customer"}, {path: "company"}]);

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Failed to update loan details"});
        }

        return res.status(201).json({
            status: 201,
            message: "Loan part payment successful",
            data: {
                ...partPaymentDetail.toObject(),
                loan: updatedLoan,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function deletePartPaymentDetail(req, res) {
    try {
        const {loanId, paymentId} = req.params;

        const loanDetails = await IssuedLoanModel.findById(loanId).select('interestLoanAmount nextInstallmentDate');
        if (!loanDetails) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        const {interestLoanAmount} = loanDetails;

        const paymentDetails = await PartPaymentModel.findById(paymentId);
        if (!paymentDetails) {
            return res.status(404).json({status: 404, message: "Part payment not found"});
        }

        const updatedInterestLoanAmount = interestLoanAmount + Number(paymentDetails.amountPaid);

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {interestLoanAmount: updatedInterestLoanAmount},
            {new: true}
        );
        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Failed to update loan details"});
        }

        const deletedPaymentDetail = await PartPaymentModel.findByIdAndDelete(paymentId);
        if (!deletedPaymentDetail) {
            return res.status(404).json({status: 404, message: "Part payment not found during deletion"});
        }

        return res.status(200).json({
            status: 200,
            message: "Payment details deleted successfully",
            data: deletedPaymentDetail,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function partRelease(req, res) {
    try {
        const {loanId} = req.params;

        const propertyImage = req.file?.buffer ? await uploadPropertyFile(req.file.buffer) : null;

        const loanDetails = await IssuedLoanModel.findById(loanId);
        if (!loanDetails) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        const releasedProperty = req.body.property;
        const finalProperty = loanDetails?.propertyDetails.filter((item) =>
            !releasedProperty.some((e) => e.id === item.id)
        );

        const partDetail = await PartReleaseModel.create({
            loan: loanId,
            propertyImage,
            ...req.body
        });

        const interestLoanAmount = Number(loanDetails.interestLoanAmount) - Number(req.body.adjustedAmount);

        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {
                interestLoanAmount,
                propertyDetails: finalProperty
            },
            {new: true}
        ).populate([{path: "scheme"}, {path: "customer"}, {path: "company"}]);

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Updated loan not found"});
        }

        const plainLoan = updatedLoan.toObject();

        return res.status(201).json({
            status: 201,
            message: "Part released successfully",
            data: {
                ...partDetail.toObject(),
                loan: plainLoan
            }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}


async function deletePartReleaseDetail(req, res) {
    try {
        const {loanId, partId} = req.params;

        // Fetch part release details
        const partRelease = await PartReleaseModel.findById(partId);
        if (!partRelease) {
            return res.status(404).json({status: 404, message: "Part release not found"});
        }

        // Fetch loan details
        const loanDetails = await IssuedLoanModel.findById(loanId);
        if (!loanDetails) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        // Safely merge property details and filter out any null or undefined values
        const restoredProperty = [
            ...(loanDetails.propertyDetails || []),
            ...(partRelease.property || [])
        ].filter(item => item != null);

        // Update the loan's interest loan amount
        const updatedInterestLoanAmount =
            Number(loanDetails.interestLoanAmount || 0) +
            Number(partRelease.adjustedAmount || 0);

        // Update loan details in the database
        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loanId,
            {
                propertyDetails: restoredProperty,
                interestLoanAmount: updatedInterestLoanAmount
            },
            {new: true}
        );

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Updated loan not found"});
        }

        // Delete the part release entry
        await PartReleaseModel.findByIdAndDelete(partId);

        // Return success response
        return res.status(200).json({
            status: 200,
            message: "Part release deleted and transaction reversed successfully",
            data: updatedLoan.toObject()
        });
    } catch (err) {
        console.error("Error in deletePartReleaseDetail:", err.message, err.stack);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getAllLoans(req, res) {
    try {
        const {companyId} = req.params
        const {type, branch} = req.query

        let query = {
            company: companyId,
            deleted_at: null
        }

        if (type) query.status = type

        const loans = await IssuedLoanModel.find(query)
            .populate('company')
            .populate({
                path: "customer",
                populate: "branch",
                match: branch ? {"branch._id": branch} : {},
            })
            .populate("scheme").populate("closedBy").populate("issuedBy").sort({createdAt: -1});

        return res.status(200).json({status: 200, data: loans});
    } catch (err) {
        console.error("Error fetching loans:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function updateLoan(req, res) {
    try {
        const {loanId} = req.params;

        let payload = req.body
        if (req.file && req.file.buffer) payload.propertyImage = await uploadPropertyFile(req.file.buffer)


        const updatedLoan = await IssuedLoanModel.findByIdAndUpdate(loanId, payload, {new: true});

        if (!updatedLoan) {
            return res.status(404).json({status: 404, message: "Loan not found."});
        }

        return res.status(200).json({status: 200, data: updatedLoan, message: "Loan updated successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function getSingleLoan(req, res) {
    const {loanId} = req.params;

    try {
        const loan = await IssuedLoanModel.findById(loanId)
            .populate("customer")
            .populate("scheme");

        if (!loan) {
            return res.status(404).json({status: 404, message: "Loan not found"});
        }

        return res.status(200).json({status: 200, data: loan});
    } catch (err) {
        console.error("Error fetching loan:", err.message);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

async function deleteMultipleLoans(req, res) {
    try {
        const {ids} = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({status: 400, message: "Invalid loan IDs."});
        }

        await IssuedLoanModel.updateMany(
            {_id: {$in: ids}},
            {$set: {deleted_at: new Date()}}
        );

        return res.status(200).json({status: 200, message: "Loans deleted successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

const generateTransactionNumber = async (companyId) => {
    const prefix = 'TRXN';

    let count = 0

    count = await IssuedLoanModel.countDocuments({company: companyId});

    count += 1;

    const numberPart = String(count).padStart(6, '0');

    const transactionNumber = `${prefix}${numberPart}`;

    return transactionNumber;
};

function getNextInterestPayDate(issueDate) {
    let originalDate = new Date(issueDate);
    let year = originalDate.getFullYear();
    let month = originalDate.getMonth();
    return new Date(year, month + 1, 0);
}

function reverseNextInterestPayDate(date) {
    let originalDate = new Date(date);
    let year = originalDate.getFullYear();
    let month = originalDate.getMonth();
    return new Date(year, month, 0);
}


const getCurrentFinancialYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 4) {
        return `${currentYear.toString().slice(-2)}_${(currentYear + 1).toString().slice(-2)}`;
    } else {
        return `${(currentYear - 1).toString().slice(-2)}_${currentYear.toString().slice(-2)}`;
    }
};

const generateLoanNumber = async (companyId) => {
    const financialYear = getCurrentFinancialYear();

    const loanCount = await IssuedLoanModel.countDocuments({
        company: companyId,
        loanNo: {$regex: `^EGF/${financialYear}`}
    });

    const newLoanCount = loanCount + 1;

    const loanNumber = `EGF/${financialYear}_${String(newLoanCount).padStart(6, '0')}`;

    return loanNumber;
};

module.exports = {
    issueLoan,
    getAllLoans,
    updateLoan,
    getSingleLoan,
    deleteMultipleLoans,
    disburseLoan,
    interestPayment,
    partRelease,
    loanPartPayment,
    GetInterestPayment,
    GetUchakInterestPayment,
    GetPartPaymentDetail,
    GetPartReleaseDetail,
    updateInterestPayment,
    updatePartReleaseDetail,
    loanClose,
    deleteInterestPayment,
    InterestReports,
    deletePartReleaseDetail,
    deletePartPaymentDetail,
    uchakInterestPayment,
    deleteUchakInterestPayment,
    GetClosedLoanDetails, getCurrentFinancialYear
}