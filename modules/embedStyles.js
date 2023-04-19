const { EmbedBuilder, quote, inlineCode, bold } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { stringTools, arrayTools, dateTools } = require('../modules/jsTools');
const { cardInventoryParser } = require('../modules/userParser');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

// Command -> /DROP
function generalDrop(user, card, dropTitle = "drop", isDuplicate = false) {
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cardManager.toString.drop(card))
        .setColor(botSettings.embedColor || null);

    if (card.imageURL) embed.setImage(card.imageURL);
    if (isDuplicate) embed.setFooter({ text: "this is a duplicate" });

    return embed;
}

// Command -> User -> /PROFILE
function userProfile(user, userData) {
    let profile_info = "\`🥕 %BALANCE\` :: \`🃏 %CARD_TOTAL\` :: \`🎚️ LV. %LEVEL\`"
        .replace("%BALANCE", userData.balance)
        .replace("%CARD_TOTAL", `${userData.card_inventory.length}/100`)
        .replace("%LEVEL", userData.level);

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | profile`, iconURL: user.avatarURL({ dynamic: true }) })
        .setThumbnail(user.avatarURL({ dynamic: true }))
        .setColor(botSettings.embedColor || null);

    if (userData.biography) embed.addFields({ name: "\`👤\` Biography", value: userData.biography });

    embed.addFields([{ name: "\`📄\` Information", value: quote(profile_info) }]);

    let card_selected = cardInventoryParser.get(userData.card_inventory, userData.card_selected_uid);
    if (card_selected) {
        card_selected = cardManager.parse.fromCardLike(card_selected);

        let card_selected_isFavorited = (userData.card_favorite_uid === card_selected.uid)
        let card_selected_f = cardManager.toString.inventory(card_selected, 0, card_selected_isFavorited);

        embed.addFields({ name: "\`📄\` Stage", value: quote(card_selected_f) });
    }

    let card_favorite = cardInventoryParser.get(userData.card_inventory, userData.card_favorite_uid);
    if (card_favorite) {
        card_favorite = cardManager.parse.fromCardLike(card_favorite);

        let card_favorite_f = cardManager.toString.inventory(card_favorite, 0, true);
        embed.addFields({ name: "\`🌟\` Favorite", value: quote(card_favorite_f) });

        if (card_favorite.imageURL) embed.setImage(card_favorite.imageURL);
    }

    return embed;
}

// Command -> User -> /COOLDOWNS
function userCooldowns(user, userData) {
    let cooldowns = [
        { name: "drop_1", timestamp: 0 },
        { name: "drop_2", timestamp: 0 },
        { name: "drop_3", timestamp: 0 },
        { name: "drop_4", timestamp: 0 },
        { name: "drop_event", timestamp: 0 },
        { name: "drop_seasonal", timestamp: 0 },
        { name: "drop_weekly", timestamp: 0 },
        { name: "daily", timestamp: 0 },
        { name: "stage", timestamp: 0 },
        { name: "random", timestamp: 0 }
    ];

    let cooldowns_user = [];
    userData.cooldowns.forEach((value, key) => cooldowns_user.push({ name: key, timestamp: value }));

    cooldowns_user.forEach(cooldown => {
        let spliceIndex = cooldowns.findIndex(c => c.name === cooldown.name);
        if (spliceIndex >= 0) cooldowns.splice(spliceIndex, 1, cooldown);
    });

    let cooldowns_f = cooldowns.map(cooldown => {
        let cooldownETA = dateTools.eta(cooldown.timestamp, true);

        return "\`%VISUAL %NAME:\` %AVAILABILITY"
            .replace("%VISUAL", cooldownETA ? "❌" : "✔️")
            .replace("%NAME", stringTools.toTitleCase(cooldown.name.replace(/_/g, " ")))
            .replace("%AVAILABILITY", bold(cooldownETA ? cooldownETA : "Available"));
    });

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | cooldowns`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cooldowns_f.join("\n"))
        .setColor(botSettings.embedColor || null);

    return embed;
}

// Command -> User -> /INVENTORY
/**
 * @param {"global" | "set"} sorting
 * @param {"ascending" | "descending"} order
 */
function userInventory(user, userData, sorting = "global", order = "descending", filter = { setID: "", groupName: "" }) {
    filter = { setID: "", group: "", ...filter };

    let userCards = userData.card_inventory;

    // Parse the CardLike objects into fully detailed cards
    userCards = userCards.map(card => cardManager.parse.fromCardLike(card));

    // Filter the cards
    if (filter.setID) userCards = userCards.filter(card => card.setID === filter.setID);
    if (filter.groupName) userCards = userCards.filter(card => card.group.toLowerCase() === filter.groupName);

    // Sort the cards
    switch (sorting) {
        case "global": userCards = userCards.sort((a, b) => a.globalID - b.globalID); break;
        case "set": userCards = userCards.sort((a, b) => a.setID - b.setID); break;
    }

    if (order === "ascending") userCards = userCards.reverse();

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let userCards_f = [];

    for (let card of cardInventoryParser.primary(userCards)) {
        // Get the duplicate cards under the primary card
        let { card_duplicates } = cardInventoryParser.duplicates(userCards, { globalID: card.globalID });

        // Whether or not this is the user's favorited card
        let isFavorite = (userData.card_favorite_uid === card.uid);

        userCards_f.push(cardManager.toString.inventory(card, card_duplicates.length, isFavorite));
    }

    // Max of 10 entires per page
    userCards_f = arrayTools.chunk(userCards_f, 10);
    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of userCards_f) {
        // Create a new embed for this inventory page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | inventory`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "try doing \`/drop\` to start filling up your inventory!")
            .setFooter({ text: `page ${pageIndex++} of ${userCards_f.length || 1} • total ${userCards.length}` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the embed array
    return embeds;
}

// Command -> User -> /VIEW
function userView(user, userData, card) {
    // Parse the CardLike into a fully detailed card
    card = cardManager.parse.fromCardLike(card);

    // Get the duplicate cards under the primary card
    let { card_duplicates } = userParser.cardInventoryParser.duplicates(userData.card_inventory, { globalID: card.globalID });

    // Whether or not this is the user's favorited card
    let isFavorite = (userData.card_favorite_uid === card.uid);

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | inventory`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cardManager.toString.inventory(card, card_duplicates.length, isFavorite))
        .setColor(botSettings.embedColor || null);

    // Add the card image to the embed if available
    if (card.imageURL) embed.setImage(card.imageURL);

    // Return the embed
    return embed;
}

// Command -> User -> /GIFT
function userGift(user, recipient, cards) {
    // Parse the CardLikes into fully detailed cards
    cards = cards.map(card => cardManager.parse.fromCardLike(card));

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | gift`, iconURL: user.avatarURL({ dynamic: true }) })
        .addFields({ name: `from:`, value: `${user}`, inline: true }, { name: `to:`, value: `${recipient}`, inline: true })
        .setColor(botSettings.embedColor || null);

    if (cards.length === 1) {
        embed.setDescription(cardManager.toString.inventory(cards[0]));

        // Add the card image to the embed if available
        if (cards[0].imageURL) embed.setImage(cards[0].imageURL);

    } else {
        embed.setDescription(cards.map(card => cardManager.toString.inventory(card)).join("\n\n"));

        // Add the last card's image to the embed if available
        let card_last = cards.slice(-1)[0];
        if (card_last.imageURL) embed.setImage(card_last.imageURL);
    }

    // Return the embed
    return embed;
}

module.exports = {
    // General Commands
    generalDrop_ES: generalDrop,

    // User Commands
    userProfile_ES: userProfile,
    userCooldowns_ES: userCooldowns,
    userInventory_ES: userInventory,
    userView_ES: userView,
    userGift_ES: userGift
};