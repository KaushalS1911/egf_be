const IssuedLoanModel = require("../models/issued-loan");
const IssuedLoanInitialModel = require("../models/issued_loan_initial");
const InterestModel = require("../models/interest");
const PartReleaseModel = require("../models/part-release");
const PartPaymentModel = require("../models/loan-part-payment");
const LoanCloseModel = require("../models/loan-close");
const UchakInterestModel = require("../models/uchak-interest-payment");
const mongoose = require('mongoose')
const {uploadFile} = require("../helpers/avatar");
const {generateNextLoanNumber} = require("../helpers/loan");
const moment = require("moment");
const PenaltyModel = require("../models/penalty");
const {uploadDir} = require("../constant");

async function issueLoan(req, res) {
    let session = null;

    try {
        // Ensure MongoDB is connected with proper replica set configuration
        session = await mongoose.startSession();
        session.startTransaction();

        const {companyId} = req.params;
        const {issueDate, series, branch, ...loanData} = req.body;

        // Generate loan number and next installment date
        const loanNo = await generateNextLoanNumber(series, companyId, branch);
        const nextInstallmentDate = getNextInterestPayDate(issueDate);

        // Process property image if available
        const propertyImage = req.file?.buffer ? await uploadFile(req.file.buffer, uploadDir.ORNAMENTS, loanNo) : null;

        // Prepare loan details
        const loanDetails = {
            ...loanData,
            issueDate,
            company: companyId,
            nextInstallmentDate,
            loanNo,
            propertyImage,
        };

        const issuedLoan = new IssuedLoanModel(loanDetails);
        await issuedLoan.save({session});

        const issuedLoanInitial = new IssuedLoanInitialModel({...loanDetails, loan: issuedLoan._id});
        await issuedLoanInitial.save({session});

        // Commit the transaction
        await session.commitTransaction();

        return res.status(201).json({
            status: 201,
            message: "Loan issued successfully",
            data: issuedLoan,
        });
    } catch (err) {
        // Abort transaction on error
        if (session) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                console.error("Error aborting transaction:", abortError);
            }
        }

        console.error("Error issuing loan:", err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    } finally {
        // End session if it exists
        if (session) {
            try {
                session.endSession();
            } catch (endError) {
                console.error("Error ending session:", endError);
            }
        }
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
            issueDate,
            approvalCharge
        } = req.body;

        // Fetch loan details
        const loanDetail = await IssuedLoanModel.findById(loan);
        if (!loanDetail) {
            return res.status(404).json({status: 404, message: "Loan not found"});
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
            approvalCharge,
            nextInstallmentDate: getNextInterestPayDate(issueDate)
        });
        // Save updated loan details
        const disbursedLoan = await IssuedLoanModel.findByIdAndUpdate(
            loan,
            loanDetail,
            {new: true}
        ).populate(["scheme", {path: "customer", populate: "branch"}, "company"]);

        if (!disbursedLoan) {
            return res.status(500).json({status: 500, message: "Failed to update loan details"});
        }

        // // Send notification
        // await sendMessage({
        //     type: "loan_issue",
        //     firstName: disbursedLoan?.customer?.firstName,
        //     middleName: disbursedLoan?.customer?.middleName,
        //     lastName: disbursedLoan?.customer?.lastName,
        //     contact: disbursedLoan.customer.contact,
        //     loanNo: disbursedLoan.loanNo,
        //     loanAmount: disbursedLoan.loanAmount,
        //     interestRate: Math.max(disbursedLoan.scheme.interestRate,1.5),
        //     consultingCharge: disbursedLoan.consultingCharge || 0,
        //     issueDate: moment(disbursedLoan.issueDate, 'DD-MM-YYYY').format(),
        //     nextInstallmentDate: moment(disbursedLoan.nextInstallmentDate, 'DD-MM-YYYY').format(),
        //     branchContact: disbursedLoan.customer.branch.contact,
        //     companyContact: disbursedLoan.company.contact,
        //     companyName: disbursedLoan?.company?.name,
        //     companyEmail: disbursedLoan?.company?.email,
        // });

        return res.status(201).json({status: 201, message: "Loan disbursed successfully", data: disbursedLoan});
    } catch (err) {
        console.error("Error in disburseLoan:", err);
        return res.status(500).json({status: 500, message: "Internal server error"});
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
    const nextInstallmentDate = getNextInterestPayDate(new Date(new Date(to).setDate(new Date(to).getDate() + 1)));
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
    if (interestDetails.isUpdated) {
        return reverseNextInterestPayDate(loanDetails.nextInstallmentDate);
    } else {
        return loanDetails.nextInstallmentDate
    }
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
        const {companyId} = req.params;

        // Fetch all loans along with their customer and scheme details
        const loans = await IssuedLoanModel.find({
            company: companyId,
            deleted_at: null
        }).populate({path: 'customer', populate: "branch"}).populate("scheme");

        // Process each loan concurrently
        const result = await Promise.all(loans.map(async (loan) => {
            let {scheme: {interestRate}, lastInstallmentDate, consultingCharge} = loan;
            loan = loan.toObject();

            // Default values
            loan.closedDate = null;
            loan.closeAmt = null;
            loan.penaltyAmount = 0;
            loan.day = 0;

            // If loan is closed, fetch the latest close date & total closed amount
            if (loan.status === 'Closed') {
                const closedLoans = await LoanCloseModel.find({loan: loan._id, deleted_at: null})
                    .sort({createdAt: -1})

                if (closedLoans.length > 0) {
                    loan.closedDate = closedLoans[0].date;
                    loan.closeAmt = closedLoans.reduce((acc, amount) => acc + (amount.netAmount || 0), 0);
                }
            }

            // Fetch interests & calculate total paid interest
            const interests = await InterestModel.find({loan: loan._id}).sort({createdAt: -1});
            const totalPaidInterest = interests.reduce((acc, interest) => acc + (interest.amountPaid || 0), 0);
            const interestDate = interests[0]?.createdAt ? new Date(interests[0]?.createdAt) : null;
            const old_cr_dr = interests[0]?.cr_dr ?? 0;

            let uchakInterest = 0;
            if (interestDate) {
                const uchakInterests = await UchakInterestModel.aggregate([
                    {$match: {loan: loan._id, date: {$gte: interestDate}}},
                    {$group: {_id: null, totalInterest: {$sum: "$amountPaid"}}}
                ]);

                uchakInterest = uchakInterests.length > 0 ? uchakInterests[0].totalInterest : 0;
            }

            // Calculate interest days
            const today = moment().startOf('day');
            const lastIntDate = interests?.length !== 0 ? moment(lastInstallmentDate).startOf('day') : moment(loan.issueDate).startOf('day');
            const daysDiff = interests?.length !== 0 ? today.diff(lastIntDate, 'days') : today.diff(lastIntDate, 'days') + 1 ;

            let penaltyDayDiff = today.diff(
                moment(interests && interests.length ? lastInstallmentDate : loan.nextInstallmentDate),
                'days'
            );

            loan.penaltyAmount = loan.status === 'Closed' ? 0 : interests.reduce((acc, interest) => acc + (interest.penalty || 0), 0);
            loan.pendingDays = loan.status === 'Closed' ? 0 : daysDiff;
            loan.day = interests.reduce((sum, entry) => sum + (Number(entry.days) || 0), 0);
            // Calculate pending interest
            const intRate = Math.min(interestRate, 1.5); // Max interest rate capped at 1.5%
            const interestFactor = (intRate / 100) * 12 / 365;
            const consultingFactor = (consultingCharge / 100) * 12 / 365;

            const interestAmount = loan.interestLoanAmount * interestFactor * daysDiff;
            const consultingAmount = loan.interestLoanAmount * consultingFactor * daysDiff;

            let pendingInterest = interestAmount + consultingAmount - uchakInterest + old_cr_dr;

            // Calculate penalty if overdue
            const penaltyData = await PenaltyModel.findOne({
                company: companyId,
                afterDueDateFromDate: { $lte: penaltyDayDiff },
                afterDueDateToDate: { $gte: penaltyDayDiff }
            }).select("penaltyInterest");

            const penaltyInterest = penaltyData?.penaltyInterest || 0;
            pendingInterest += (loan.interestLoanAmount * (penaltyInterest / 100) * 12 * daysDiff) / 365;

            // Assign final values
            loan.interestAmount = loan.status === 'Closed' ? 0 : interests.reduce((acc, interest) => acc + (interest.interestAmount || 0), 0);
            loan.consultingAmount = loan.status === 'Closed' ? 0 : interests.reduce((acc, interest) => acc + (interest.consultingCharge || 0), 0);
            loan.penaltyAmount = loan.status === 'Closed' ? 0 : interests.reduce((acc, interest) => acc + (interest.penalty || 0), 0);
            loan.pendingInterest = loan.status === 'Closed' ? 0 :pendingInterest;
            loan.totalPaidInterest = totalPaidInterest;
            loan.cr_dr = loan.status === 'Closed' ? 0 : old_cr_dr;

            return loan;
        }));

        return res.status(200).json({status: 200, data: result});
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

        const propertyImage = req.file?.buffer ? await uploadFile(req.file.buffer, uploadDir.ORNAMENTS, req.file.originalname) : null;

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
        const { companyId } = req.params;
        const { type, branch } = req.query;

        const query = { company: companyId, deleted_at: null };
        if (type) query.status = type;

        let loans = await IssuedLoanModel.find(query)
            .populate('company scheme closedBy issuedBy')
            .populate({ path: 'customer', populate: { path: 'branch' } })

        if (branch) {
            loans = loans.filter(loan =>
                loan.customer?.branch?._id.toString() === branch
            );
        }

        const loanDetails = await Promise.all(loans.map(async (loan) => {
            if (loan.status === "Closed") {
                const closedLoan = await LoanCloseModel.findOne({ loan: loan._id });
                return { ...loan.toObject(), closingDate: closedLoan?.date, closingCharge: closedLoan?.closingCharge };
            }
            return loan.toObject();
        }));

        return res.status(200).json({
            status: 200,
            data: loanDetails
        });

    } catch (error) {
        console.error(`Error fetching loans: ${error.message}`);
        return res.status(500).json({
            status: 500,
            message: "Failed to retrieve loans"
        });
    }
}


async function updateLoan(req, res) {
    try {
        const {loanId} = req.params;

        let payload = req.body
        if (req.file && req.file.buffer) payload.propertyImage = await uploadFile(req.file.buffer, uploadDir.ORNAMENTS, req.body.loanNo)

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

async function deleteIssuedLoan(req, res) {
    try {
        const {loanId, companyId} = req.params;

        const [issuedLoans] = await IssuedLoanModel.find({
            company: companyId,
            deleted_at: null
        }).sort({createdAt: -1}).limit(1)

        if (issuedLoans._id.toString() !== loanId) {
            return res.status(400).json({status: 400, message: "Loan cannot be deleted because it is not latest one."});
        }

        await IssuedLoanModel.findByIdAndUpdate(loanId, {deleted_at: new Date()}, {new: true})

        return res.status(200).json({status: 200, message: "Loan deleted successfully"});
    } catch (err) {
        console.error(err);
        return res.status(500).json({status: 500, message: "Internal server error"});
    }
}

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

function isLastDayOfMonth(date) {
    const currentMonth = date.getMonth();
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay.getMonth() !== currentMonth;
}

module.exports = {
    issueLoan,
    getAllLoans,
    updateLoan,
    getSingleLoan,
    deleteIssuedLoan,
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