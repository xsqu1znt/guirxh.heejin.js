const { EmbedBuilder, quote, inlineCode, bold } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { stringTools } = require('../modules/jsTools');
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
function userProfile(user) {
    let profile_info = "\`🥕 %BALANCE\` :: \`🃏 %CARD_TOTAL\` :: \`🎚️ LV. %LEVEL\`"
        .replace("%BALANCE", "100")
        .replace("%CARD_TOTAL", "1/100")
        .replace("%LEVEL", "1");

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | profile`, iconURL: user.avatarURL({ dynamic: true }) })
        .setThumbnail(user.avatarURL({ dynamic: true }))
        .addFields([
            { name: "\`👤\` Biography", value: quote("N/A"), inline: false },

            { name: "\`📄\` Information", value: quote(profile_info), inline: false },

            { name: "\`📄\` Stage", value: quote("N/A"), inline: false },
            { name: "\`🌟\` Favorite", value: quote("N/A"), inline: false }
        ]).setColor(botSettings.embedColor || null);

    return embed;
}

// Command -> User -> /COOLDOWNS
function userCooldowns(user) {
    let cooldowns = [
        { name: "drop_1", timestamp: Date.now() },
        { name: "drop_2", timestamp: Date.now() },
        { name: "drop_3", timestamp: Date.now() },
        { name: "drop_4", timestamp: Date.now() },
        { name: "drop_event", timestamp: Date.now() },
        { name: "drop_seasonal", timestamp: Date.now() },
        { name: "drop_weekly", timestamp: Date.now() },
        { name: "daily", timestamp: Date.now() },
        { name: "stage", timestamp: Date.now() },
        { name: "random", timestamp: Date.now() }
    ];

    let cooldowns_f = cooldowns.map(cooldown => "\`%VISUAL %NAME:\` %AVAILABILITY"
        .replace("%VISUAL", "✔️")
        .replace("%NAME", stringTools.toTitleCase(cooldown.name.replace(/_/g, " ")))
        .replace("%AVAILABILITY", bold("Available"))
    );

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