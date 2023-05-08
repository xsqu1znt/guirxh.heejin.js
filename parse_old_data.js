// This script is to parse data in the OLD format and convert it into the new format

require('dotenv').config();
const fs = require('fs');

const { userSettings } = require('./configs/heejinSettings.json');
const cardManager = require('./modules/cardManager');
const logger = require('./modules/logger');
const mongo = require('./modules/mongo');

let users = require('./users_5_5_2023.json'); /* users = users.slice(0, 1); */
let cards = require('./cards_5_5_2023.json');

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
    await mongo.connect(process.env.MONGO_URI_OLD);

    logger.log("getting users...");

    let users_current = await mongo.userManager.fetch(null, "full");

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
}

// return backupUsers();

async function removeCustoms() {
    await mongo.connect(process.env.MONGO_URI_OLD);

    console.log("getting users...");

    let users_current = await mongo.userManager.fetch(null, "full");

    console.log("fixing inventories...");

    users_current.forEach(user => {
        console.log(`working on user: (${user._id})`);

        user.card_inventory = user.card_inventory.filter(card => !["100", "101", "102", "103"].includes(card.globalID));
        // .map(card => [100, 101, 102, 103].includes(card.rarity) ? card : cardManager.parse.toCardLike(card));
    });

    console.log("awaiting mongo...");

    await Promise.all(users_current.map(user =>
        mongo.userManager.update(user._id, { card_inventory: user.card_inventory }))
    );

    console.log("done");
}

// return removeCustoms();

async function reAddCustoms() {
    await mongo.connect(process.env.MONGO_URI_OLD);

    console.log("adding cards...");

    await Promise.all(users.map(user => {
        user = parseUser(user);
        let customs = user.card_inventory.filter(card => card.setID === "100");

        return mongo.userManager.cards.add(user._id, customs);
    }));

    console.log("done");
}

// return reAddCustoms();

async function restoreVault() {
    await mongo.connect(process.env.MONGO_URI_OLD);

    console.log("getting users...");

    let users_current = await mongo.userManager.fetch(null, "full");

    console.log("fixing inventories...");

    users_current.forEach(user => {
        console.log(`working on user: (${user._id})`);

        let user_backup = users.find(u => u.UserID === user._id);
        if (!user_backup) return;

        for (let card of user.card_inventory) {
            let card_backup = user_backup.CardsV2[card.uid];

            if (card_backup && card_backup.Locked) card.locked = true;
        }
    });

    console.log("awaiting mongo...");

    await Promise.all(users_current.map(user =>
        mongo.userManager.update(user._id, { card_inventory: user.card_inventory }))
    );

    console.log("done");
}

// restoreVault();

async function exportUser(userID, fn) {
    await mongo.connect(process.env.MONGO_URI_OLD);

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
}

// return exportUser("797233513136390175", "user_gui.json");