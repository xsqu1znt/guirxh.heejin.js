const { EmbedBuilder, quote, bold, TimestampStyles } = require('discord.js');

const { botSettings, userSettings, shopSettings } = require('../configs/heejinSettings.json');
const { arrayTools, stringTools, numberTools, dateTools } = require('../modules/jsTools');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');

// Command -> General -> /COLLECTIONS
/** @param {"ascending" | "decending"} order */
function globalCollections_ES(user, options = { order: "decending", filter: { group: "", category: "" } }) {
    let { cards_all } = cardManager;

    // Sort by set ID (decending order)
    cards_all = cards_all.sort((a, b) => a.setID - b.setID);
    if (options.order === "ascending") cards_all = cards_all.reverse();

    // Apply command filters
    if (options.filter.group) cards_all = cards_all.filter(card => card.group.toLowerCase() === options.filter.group);
    if (options.filter.category) cards_all = cards_all.filter(card => card.category.toLowerCase() === options.filter.category);

    // Create an array the only contains unique cards
    let cards_unique = arrayTools.unique(cards_all, (card, card_compare) => card.setID === card_compare.setID);

    // Get the number of cards in a set by using each unique card's set ID
    let card_totals = cards_unique.map(card => cards_all.filter(c => c.setID === card.setID).length);

    // Parse the card into a human readable format
    let collections_f = cards_unique.map((card, idx) => cardManager.toString.setEntry(card, card_totals[idx]));
    collections_f = arrayTools.chunk(collections_f, 10);

    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of collections_f) {
        // Create a new embed for this inventory page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | collections`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "no collections were found.")
            .setFooter({ text: `page ${pageIndex++} of ${collections_f.length || 1} • total sets: ${cards_unique.length}` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the array of embeds
    return embeds;
}

// Command -> General -> /SHOP
function globalShop_ES(user) {
    let { cards_all } = cardManager;

    // Filter out cards that aren't currently in the shop
    let cards_shop = cards_all.filter(card => shopSettings.stockSetIDs.includes(card.setID));

    // Sort by global ID (decending order)
    cards_shop = cards_shop.sort((a, b) => a.globalID - b.globalID);

    // Parse the card into a human readable format
    let cards_shop_f = cards_shop.map(card => cardManager.toString.shopEntry(card));
    cards_shop_f = arrayTools.chunk(cards_shop_f, 10);

    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of cards_shop_f) {
        // Create a new embed for this inventory page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | shop`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "the shop is empty!")
            .setFooter({ text: `page ${pageIndex++} of ${cards_shop_f.length || 1} • /shop buy <gid> • /view gid <gid>` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the array of embeds
    return embeds;
}

// Command -> User -> /DROP
function userDrop_ES(user, cards, cards_isDuplicate, dropTitle = "drop") {
    if (!Array.isArray(cards)) cards = [cards];
    if (!Array.isArray(cards_isDuplicate)) cards_isDuplicate = [cards_isDuplicate];

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cards.map((card, idx) => cardManager.toString.inventory(card, {
            isDuplicate: cards_isDuplicate[idx] || false,
            simplify: true
        })).join("\n"))
        .setColor(botSettings.embedColor || null);

    let card_last = cards.slice(-1)[0];
    if (card_last.imageURL) embed.setImage(card_last.imageURL);

    return embed;
}

// Command -> User -> /COOLDOWNS
function userCooldowns_ES(user, userData) {
    let cooldowns = Object.keys(userSettings.cooldowns).map(name => ({ name, timestamp: 0 }));

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

// Command -> User -> /PROFILE
function userProfile_ES(user, userData, compactMode = false) {
    let profile_info = "\`🥕 %BALANCE\` :: \`🃏 %CARD_TOTAL\` :: \`🎚️ LV. %LEVEL\`"
        .replace("%BALANCE", userData.balance)
        .replace("%CARD_TOTAL", `${userData.card_inventory.length}/${cardManager.cardTotal}`)
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
            let card_selected_f = cardManager.toString.inventory(card_selected, {
                favorited: card_selected_isFavorited, selected: true
            });

            embed.addFields({ name: "\`📄\` Stage", value: quote(card_selected_f) });
        }

        let card_favorite = userParser.cards.get(userData.card_inventory, userData.card_favorite_uid);
        if (card_favorite) {
            let card_favorite_f = cardManager.toString.inventory(card_favorite, {
                favorited: true, selected: card_selected
            });

            embed.addFields({ name: "\`🌟\` Favorite", value: quote(card_favorite_f) });

            // Add the card's image to the user's profile
            if (card_favorite.imageURL) embed.setImage(card_favorite.imageURL);
        }
    }

    return embed;
}

// Command -> User -> /INVENTORY
/**
 * @param {"global" | "set"} sorting
 * @param {"ascending" | "descending"} order
 */
function userInventory_ES(user, userData, sorting = "set", order = "descending", filter = { setID: "", groupName: "" }) {
    filter = { setID: "", group: "", ...filter };
    sorting ||= "set"; order ||= "descending";

    // Parse the CardLike objects into fully detailed cards
    let cards_user = userData.card_inventory.map(card => cardManager.parse.fromCardLike(card));

    // Filter the cards
    if (filter.setID) cards_user = cards_user.filter(card => card.setID === filter.setID);
    if (filter.groupName) cards_user = cards_user.filter(card => card.group.toLowerCase() === filter.groupName);

    // Sort the cards
    switch (sorting) {
        case "global": cards_user = cards_user.sort((a, b) => a.globalID - b.globalID); break;
        case "set": cards_user = cards_user.sort((a, b) => a.setID - b.setID); break;
    }

    if (order === "ascending") cards_user = cards_user.reverse();

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let cards_user_f = [];

    let cards_user_primary = userParser.cards.primary(cards_user);
    for (let card of cards_user_primary) {
        // Get the duplicate cards under the primary card
        let { card_duplicates } = userParser.cards.duplicates(cards_user, { globalID: card.globalID });

        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === userData.card_selected_uid);

        cards_user_f.push(cardManager.toString.inventory(card, {
            duplicate_count: card_duplicates.length,
            favorited: isFavorite,
            selected: isSelected
        }));
    }

    // Max of 10 entires per page
    cards_user_f = arrayTools.chunk(cards_user_f, 10);
    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of cards_user_f) {
        // Create a new embed for this inventory page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | inventory`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "try doing \`/drop\` to start filling up your inventory!")
            .setFooter({ text: `page ${pageIndex++} of ${cards_user_f.length || 1} | total cards: ${cards_user_primary.length}` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the embed array
    return embeds;
}

// Command -> User -> /VIEW UID | /VIEW GID | /VIEW FAVORITE
/** @param {"uid" | "global" | "favorite" | "idol"} viewStyle */
function userView_ES(user, userData, card, viewStyle = "uid", showDuplicates = true) {

    // Create the embed
    let embed = new EmbedBuilder().setColor(botSettings.embedColor || null);
    let embed_title = "%USER | view";

    switch (viewStyle) {
        case "uid":
            let duplicate_count = 0; if (showDuplicates) {
                let { card_duplicates } = userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID });
                duplicate_count = card_duplicates.length;
            }

            // Whether or not this is the user's favorite card
            let isFavorite = (card.uid === userData.card_favorite_uid);

            embed.setDescription(cardManager.toString.inventory(card, { duplicate_count, favorited: isFavorite }));
            break;

        case "global":
            embed.setDescription(cardManager.toString.inventory(card, { simplify: true }));
            break;

        case "favorite":
            embed_title = "%USER | favorite"
            embed.setDescription(cardManager.toString.inventory(card, { favorited: true }));
            break;

        case "idol":
            embed_title = "%USER | idol"
            embed.setDescription(cardManager.toString.inventory(card, { selected: true }));
            break;
    }

    // Set the title and author icon for the embed
    embed.setAuthor({ name: embed_title.replace("%USER", user.username), iconURL: user.avatarURL({ dynamic: true }) })

    // Add the card image to the embed if available
    if (card.imageURL) embed.setImage(card.imageURL);

    // Return the embed
    return embed;
}

// Command -> User -> /TEAM VIEW
function userTeamView_ES(user, userData) {
    // Convert the user's card_inventory into an array
    let cards_team = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids);

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let cards_team_f = arrayTools.chunk(cards_team.map(card => {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        return cardManager.toString.inventory(card, { favorited: isFavorite });
    }), 1);

    // Get the total team's ability
    let totalAbility = 0; cards_team.map(card => totalAbility += card.stats.ability);
    totalAbility = stringTools.formatNumber(Math.floor(totalAbility / 1000), { round: true });

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
function userGift_ES(user, recipient, cards) {
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
    globalCollections_ES,
    globalShop_ES,

    // User Commands
    userDrop_ES,
    userCooldowns_ES,
    userProfile_ES,
    userInventory_ES,
    userView_ES,
    userTeamView_ES,
    userGift_ES
};