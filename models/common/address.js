const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
    street: String,
    landmark: String,
    country: String,
    state: String,
    city: String,
    zipcode: String,
    area: String
})

module.exports = addressSchema