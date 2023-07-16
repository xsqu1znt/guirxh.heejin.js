// This script is to parse data in the OLD format and convert it into the new format

require('dotenv').config();
const fs = require('fs');

const { userSettings } = require('../../configs/heejinSettings.json');

const { userManager } = require('../../modules/mongo/index');
const cardManager = require('../../modules/cardManager');
const userParser = require('../../modules/userParser');
const logger = require('../../modules/logger');
const mongo = require('../../modules/mongo');

let backup_users = require('../../.backup/users/users_23_07_15_1.json');
// let backup_cards = require('./cards_5_5_2023.json');

function parseUser(user) {
    return {
        _id: user.UserID,

        daily_streak: user.DailyStreak.Count,
        daily_streak_expires: user.DailyStreak.Expires,

        level: user.Level,
        xp: user.Xp,
        xp_for_next_level: user.Level * userSettings.xp.nextLevelXPMultiplier,

        biography: user.Biography,
        balance: 0,

        card_selected_uid: String(user.BattleCard || ""),
        card_favorite_uid: String(user.FavoriteCard || ""),
        card_team_uids: user.Team.length > 0 ? user.Team.map(card => String(card.CardID)) : [],
        card_inventory: Object.entries(user.CardsV2)
            .map(card => parseCard(card[1], card[0]))
            .map(card => [100, 101, 102, 103].includes(card.rarity) ? card : cardManager.parse.toCardLike(card)),

        timestamp_started: Date.now()
    };
}

function parseCard(card, uid = "") {
    card = {
        name: card.Name,
        group: card.Group,
        single: card.Single,
        category: card.Category,
        description: card.Description,
        emoji: card.Emoji,

        uid: String(uid),
        globalID: String(card.GlobalID),
        setID: String(card.SetID),
        rarity: card.Rarity,
        price: card.Price,
        sellPrice: card.SellPrice,

        stats: {
            level: card.Level,
            xp: card.Xp,
            xp_for_next_level: 100,

            ability: card.Ability,
            reputation: card.Reputation
        },

        imageURL: card.ImageRoot
    };


    if (card.stats.level > 1)
        card = cardManager.recalculateStats(card);

    return card;
}

async function backupUsers() {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("getting users...");

    let users_current = await userManager.fetch(null, { type: "full" });

    // Parse the object into a string
    logger.log("converting into JSON...");
    let jsonData = JSON.stringify(users_current, null, 2);

    // Save the file
    logger.log("writing file...");

    let fn = `users_${new Date().toLocaleDateString().replace(/\//g, "_")}.json`;
    fs.writeFile(fn, jsonData, (err) =>
        err ? logger.error(`Failed to save ${fn}`, "could not write", err) : null
    );

    logger.success(`file saved: \`${fn}\``);
} // return backupUsers();

async function exportUser(userID, fn) {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("fetching user...");

    // Fetch the user 
    let user = await mongo.userManager.fetch(userID, "full");

    // Parse the object into a string
    logger.log("converting into JSON...");
    let jsonData = JSON.stringify(user, null, 2);

    // Save the file
    logger.log("writing file...");
    fs.writeFile(fn, jsonData, (err) =>
        err ? logger.error(`Failed to save ${fn}`, "could not write", err) : null
    );

    logger.success(`file saved: \`${fn}\``);
} // return exportUser("660576955275411464", "user.json");

//! Functions
async function resetUIDs() {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("getting users...");

    let users_current = await userManager.fetch(null, { type: "full" });

    logger.log("fixing card_inventory");
    await Promise.all(users_current.map(async _user => {
        for (i = 0; i < _user.card_inventory.length; i++) {
            _user.card_inventory[i].uid = _user.card_inventory[i].uid.toUpperCase();
        }

        _user.card_selected_uid = _user.card_selected_uid.toUpperCase();
        _user.card_favorite_uid = _user.card_favorite_uid.toUpperCase();

        for (t = 0; t < _user.card_team_uids.length; t++)
            _user.card_team_uids[i] &&= _user.card_team_uids[i].toUpperCase();

        // Save the UserData to Mongo
        logger.log(`saving fixed card_inventory for user: ${_user._id}`);
        return await userManager.update(_user._id, {
            card_selected_uid: _user.card_selected_uid,
            card_favorite_uid: _user.card_favorite_uid,
            card_team_uids: _user.card_team_uids,

            card_inventory: _user.card_inventory
        });
    }));

    logger.log("done");
} // return resetUIDs();

async function formatCardLikes() {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("getting users...");

    let users_current = await userManager.fetch(null, { type: "full" });

    logger.log("fixing card_inventory");
    await Promise.all(users_current.map(async _user => {
        for (i = 0; i < _user.card_inventory.length; i++) {
            _user.card_inventory[i] = cardManager.parse.toCardLike(_user.card_inventory[i]);
        }

        // Save the UserData to Mongo
        logger.log(`saving fixed card_inventory for user: ${_user._id}`);
        return await userManager.update(_user._id, { card_inventory: _user.card_inventory });
    }));

    logger.log("done");
} // return formatCardLikes();

async function readdCustoms() {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("getting users...");

    let users_current = await userManager.fetch(null, { type: "full" });

    logger.log("fixing card_inventory");
    await Promise.all(users_current.map(async _user => {
        // Parse card_inventory to get card's rarity
        // userParser.cards.parseInventory(_user, { fromCardLike: true, unique: false });

        // Remove customs
        // _user.card_inventory = _user.card_inventory.filter(card => card.rarity !== 100);

        // Convert card_inventory back into cardLikes
        /* for (let i = 0; i < _user.card_inventory.length; i++) {
            _user.card_inventory[i] = cardManager.parse.toCardLike(_user.card_inventory[i]);
        } */

        /// Get customs from backup user
        let _backup_user = backup_users.find(uD => uD._id === _user._id);
        if (!_backup_user) return console.error(`user not found with user id: ${_user._id}`)

        let _backup_customs = _backup_user.card_inventory.filter(c => c?.rarity === 100);

        // Add customs from backup
        _user.card_inventory.push(..._backup_customs);

        // Save the UserData to Mongo
        logger.log(`saving fixed card_inventory for user: ${_user._id}`);
        return await userManager.update(_user._id, { card_inventory: _user.card_inventory });
    }));

    logger.log("done");
} // return readdCustoms();

async function removeInvalidCustoms() {
    await mongo.connect(process.env.MONGO_URI_PROD);

    logger.log("getting users...");

    let users_current = await userManager.fetch(null, { type: "full" });

    logger.log("fixing card_inventory");
    await Promise.all(users_current.map(async _user => {
        // Remove customs
        _user.card_inventory = _user.card_inventory.filter(card => !["100", "101", "102", "103"].includes(card.globalID) && !card?.name);

        // Save the UserData to Mongo
        logger.log(`saving fixed card_inventory for user: ${_user._id}`);
        return await userManager.update(_user._id, { card_inventory: _user.card_inventory });
    }));

    logger.log("done");
} // return removeInvalidCustoms();