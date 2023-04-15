const { EmbedBuilder, quote, inlineCode, bold } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { stringTools, dateTools } = require('../modules/jsTools');
const { cardnventoryParser } = require('../modules/userParser');
const cardManager = require('../modules/cardManager');

// Command -> /DROP
function generalDrop(user, card, dropTitle = "drop", isDuplicate = false) {
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cardManager.format.drop(card))
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

    if (userData.biography) embed.addFields({ name: "\`👤\` Biography", value: quote("N/A") });

    embed.addFields([{ name: "\`📄\` Information", value: quote(profile_info) }]);

    let card_selected = cardnventoryParser.fetch(userData.card_inventory, userData.card_selected_uid);
    if (card_selected) embed.addFields({ name: "\`📄\` Stage", value: quote("Selected card") });

    let card_favorite = cardnventoryParser.fetch(userData.card_inventory, userData.card_favorite_uid);
    if (card_favorite) {
        embed.addFields({ name: "\`🌟\` Favorite", value: quote("Favorited card") });
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

module.exports = {
    // General Commands
    generalDrop_ES: generalDrop,

    // User Commands
    userProfile_ES: userProfile,
    userCooldowns_ES: userCooldowns
};