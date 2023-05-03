require('dotenv').config();
const fs = require('fs');

const mongoose = require("mongoose");
const mongo = require('./modules/mongo');
const logger = require('./modules/logger');

const MONGO_URI_OLD = process.env.MONGO_URI_OLD;

const models = {
    old: {
        user: require('../../heejinbot/Models/Inventory'),
        card: require('../../heejinbot/Models/AllCards')
    }
};


async function fetch_users(userID, fn) {
    // Connect to MongoDB
    await mongo.connect(MONGO_URI_OLD);

    logger.log("fetching user(s)...");

    let users;
    // Fetch the user if the an ID was provided
    if (userID) users = await models.old.user.findOne({ UserID: userID });
    // Fetch every user in the database if an ID was not provided
    users ||= await models.old.user.find();

    // Parse the object into a string
    logger.log("converting into JSON...");
    let jsonData = JSON.stringify(users, null, 2);

    // Save the file
    logger.log("writing file...");
    fs.writeFile(fn, jsonData, (err) =>
        err ? logger.error(`Failed to save ${fn}`, "could not write", err) : null
    );

    logger.success(`file saved: \`${fn}\``);
}

async function fetch_cards(fn) {
    // Connect to MongoDB
    await mongo.connect(MONGO_URI_OLD);
    
    // Fetch every card in the database
    logger.log("fetching cards...");
    let cards = await models.old.card.find();

    // Parse the object into a string
    logger.log("converting into JSON...");
    let jsonData = JSON.stringify(cards, null, 2);

    // Save the file
    logger.log("writing file...");
    fs.writeFile(fn, jsonData, (err) =>
        err ? logger.error(`Failed to save ${fn}`, "could not write", err) : null
    );

    logger.success(`file saved: \`${fn}\``);
}

fetch_users(null, "user.json");