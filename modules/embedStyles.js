const { EmbedBuilder, quote, bold, TimestampStyles } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { arrayTools, stringTools, numberTools, dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

// Command -> /DROP
function generalDrop(user, cards, cards_isDuplicate, dropTitle = "drop") {
    if (!Array.isArray(cards)) cards = [cards];
    if (!Array.isArray(cards_isDuplicate)) cards_isDuplicate = [cards_isDuplicate];

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cards.map((card, idx) => cardManager.toString.drop(card, cards_isDuplicate[idx] || false)).join("\n"))
        .setColor(botSettings.embedColor || null);

    let card_last = cards.slice(-1)[0];
    if (card_last.imageURL) embed.setImage(card_last.imageURL);

    return embed;
}

// Command -> User -> /PROFILE
function userProfile(user, userData, compactMode = false) {
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

    if (!compactMode) {
        let card_selected = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
        if (card_selected) {
            let card_selected_isFavorited = (card_selected.uid === userData.card_favorite_uid)
            let card_selected_f = cardManager.toString.inventory(card_selected, 0, card_selected_isFavorited);

            embed.addFields({ name: "\`📄\` Stage", value: quote(card_selected_f) });
        }

        let card_favorite = userParser.cards.get(userData.card_inventory, userData.card_favorite_uid);
        if (card_favorite) {
            let card_favorite_f = cardManager.toString.inventory(card_favorite, 0, true);
            embed.addFields({ name: "\`🌟\` Favorite", value: quote(card_favorite_f) });

            if (card_favorite.imageURL) embed.setImage(card_favorite.imageURL);
        }
    }

    return embed;
}

// Command -> User -> /COOLDOWNS
function userCooldowns(user, userData) {
    let cooldowns = [
        { name: "drop_5", timestamp: 0 },
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
            .replace("%AVAILABILITY", bold(cooldownETA
                ? `<t:${numberTools.milliToSeconds(cooldown.timestamp)}:${TimestampStyles.RelativeTime}>`
                : "Available"));
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
function userInventory(user, userData, sorting = "set", order = "descending", filter = { setID: "", groupName: "" }) {
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

    for (let card of userParser.cards.primary(userCards)) {
        // Get the duplicate cards under the primary card
        let { card_duplicates } = userParser.cards.duplicates(userCards, { globalID: card.globalID });

        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

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
            .setFooter({ text: `page ${pageIndex++} of ${userCards_f.length || 1} | total ${userCards.length}` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the embed array
    return embeds;
}

// Command -> User -> /VIEW | /IDOL
function userView(user, userData, card, isIdol = false) {
    // Get the duplicate cards under the primary card
    let card_duplicates = []; if (!isIdol)
        card_duplicates = userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID });

    // Whether or not this is the user's favorited card
    let isFavorite = (card.uid === userData.card_favorite_uid);

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${isIdol ? "idol" : "view"}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cardManager.toString.inventory(card, card_duplicates.length, isFavorite))
        .setColor(botSettings.embedColor || null);

    // Add the card image to the embed if available
    if (card.imageURL) embed.setImage(card.imageURL);

    // Return the embed
    return embed;
}

// Command -> User -> /TEAM VIEW
function userTeamView(user, userData) {
    // Convert the user's card_inventory into an array
    let cards_team = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids);

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let cards_team_f = arrayTools.chunk(cards_team.map(card => {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        return cardManager.toString.inventory(card, 0, isFavorite);
    }), 1);

    // Get the total team's ability
    let totalAbility = 0; cards_team.map(card => totalAbility += card.stats.ability);

    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of cards_team_f) {
        let card_image = cards_team[pageIndex - 1]?.imageURL;

        // Create a new embed for this team page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | team`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "You don't have a team set yet.")
            .setFooter({ text: `${pageIndex++} of ${cards_team_f.length || 1} | team ability: ${totalAbility}` })
            .setColor(botSettings.embedColor || null);

        // Add the card image to the embed if available
        if (card_image) embed_page.setImage(card_image);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    }

    // Return the array of embeds
    return embeds;
}

// Command -> User -> /GIFT
function userGift(user, recipient, cards) {
    let fromTo = `from: ${user} to: ${recipient}`;

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | gift`, iconURL: user.avatarURL({ dynamic: true }) })
        .setColor(botSettings.embedColor || null);

    if (cards.length === 1) {
        embed.setDescription(cardManager.toString.inventory(cards[0]) + "\n\n" + fromTo);

        // Add the card image to the embed if available
        if (cards[0].imageURL) embed.setImage(cards[0].imageURL);

    } else {
        embed.setDescription(cards.map(card => cardManager.toString.inventory(card)).join("\n") + "\n\n" + fromTo);

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
    userTeamView_ES: userTeamView,
    userGift_ES: userGift
};