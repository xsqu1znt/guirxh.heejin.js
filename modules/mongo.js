// Connects us to our Mongo database so we can save and retrieve data.

const { userSettings } = require('../configs/heejinSettings.json');
const logger = require('./logger');

// Models
const models = {
    user: require('../models/userModel')
};

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

//! Database Functions
// Users
async function user_exists(userID) {
    let exists = await models.user.exists({ _id: userID });
    return exists ? true : false;
}

async function user_fetch(userID) {
    let user = await models.user.findById(userID);
    return user || null;
}

async function user_new(userID) {
    let user = await models.user.findById(userID);
    user ||= await new models.user({
        _id: userID,
        balance: userSettings.startingBalance,
        timestamp_started: Date.now()
    }).save();

    return user || null;
}

module.exports = {
    /** Connect to MongoDB */
    connect: () => {
        mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
            .then(() => logger.success("successfully connected to MongoDB"))
            .catch(err => logger.error("failed to connect to MongoDB", null, err));
    },

    userManager: {
        exists: user_exists,
        fetch: user_fetch,
        new: user_new
    }
};