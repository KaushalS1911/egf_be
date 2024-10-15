const SchemeModel = require('./models/scheme');
const CaratModel = require('./models/carat');
const PropertyModel = require('./models/property');
const PenaltyModel = require('./models/penalty');
const BranchModel = require('./models/branch');

async function seedData(companyId) {
    try {
        await Promise.all([
            createSeed(SchemeModel, getSchemeSeedData(companyId)),
            createSeed(BranchModel, getBranchSeedData(companyId)),
            createSeed(CaratModel, getCaratSeedData(companyId)),
            createSeed(PenaltyModel, getPenaltySeedData(companyId)),
            createSeed(PropertyModel, getPropertySeedData(companyId))
        ]);
        console.log('Data seeding successful.');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

async function createSeed(model, data) {
    await model.create(data);
}

function getSchemeSeedData(company) {
    return {
        company,
        name: "S1",
        interestRate: 1,
        interestPeriod: "Monthly",
        schemeType: "Regular",
        valuation: 57,
        renewalTime: "6 Months",
        minLoanTime: 60,
        ratePerGram: 4275,
        remark: ""
    };
}

function getBranchSeedData(company) {
    return {
        company,
        name: "HOME",
        email: "branch@gmail.com",
        contact: "1234567890",
    };
}

function getCaratSeedData(company) {
    return {
        company,
        name: "0",
        caratPercentage: 0,
        remark: ""
    };
}

function getPropertySeedData(company) {
    return {
        company,
        propertyType: "BENGLES",
        loanType: "GOLD LOAN",
        quantity: 1,
        isQtyEdit: true,
        remark: ""
    };
}

function getPenaltySeedData(company) {
    return {
        company,
        afterDueDateFromDate: 1,
        afterDueDateToDate: 7,
        penaltyInterest: 0,
        remark: ""
    };
}

module.exports = seedData;
