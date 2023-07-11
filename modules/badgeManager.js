const { botSettings } = require('../configs/heejinSettings.json');
const botConfig = require('../configs/config_bot.json');

const { arrayTools } = require('./jsTools');
const { markdown: { bold, italic, inline, link } } = require('./discordTools');

const badges = require('../items/badges.json');

function get_badgeID(id) {
    return structuredClone(badges.find(badge => badge.id.toLowerCase() === id)) || null;
}

function get_setID(setID) {
    return structuredClone(badges.filter(badge => badge.setID === setID)) || [];
}

function parse_toBadgeLike(badge) {
    return {
        id: badge.id,
        setID: badge.setID,
    };
}

function parse_fromBadgeLike(badgeLike) {
    return { ...get_badgeID(badgeLike.id.toLowerCase()), ...badgeLike };
}

function toString_basic(badge) {
    return "%EMOJI %SET :: %NAME"
        .replace("%EMOJI", badge.customEmoji || `\`${badge.emoji}\``)
        .replace("%SET", `**${badge.set}**`)
        .replace("%NAME", `*${link(badge.name, badge.emojiURL, badge.description)}*`);
}

function toString_profile(badge) {
    return "%EMOJI %SET %NAME"
        .replace("%EMOJI", badge.customEmoji || `\`${badge.emoji}\``)
        .replace("%SET", `**${badge.set}**`)
        .replace("%NAME", `*${link(badge.name, badge.emojiURL, badge.description)}*`);
}

function toString_setEntry(setID) {
    let set_badges = get_setID(setID); if (!set_badges.length) return "n/a";
    let set_badges_first = set_badges.slice(-1)[0];

    let count = set_badges.length >= 10 ? set_badges.length : `0${set_badges.length}`;

    return "%SET_ID %BADGE_COUNT %CATEGORY %EMOJI %SET"
        .replace("%SET_ID", `\`🗣️ ${set_badges_first.setID}\``)

        .replace("%BADGE_COUNT", `\`📁 ${count}\``)

        .replace("%CATEGORY", `\`${set_badges_first.category}\``)
        .replace("%EMOJI", set_badges_first?.customEmoji || `\`${set_badges_first.emoji}\``)
        .replace("%SET", `**${set_badges_first.set}**`);
}

function toString_shopEntry(badge) {
    return "%ID %EMOJI %SET :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY\n> %DESCRIPTION"
        .replace("%ID", `\`${badge.id}\``)
        .replace("%EMOJI", badge.customEmoji || `\`${badge.emoji}\``)
        .replace("%NAME", link(badge.name, badge.emojiURL, badge.description))
        .replace("%PRICE", `\`${botConfig.emojis.CURRENCY_1.EMOJI} ${badge.price}\``)

        .replace("%SET_ID", `\`🗣️ ${badge.setID}\``)
        .replace("%SET", `**${badge.set}**`)
        .replace("%RARITY", `\`RB${badge.rarity}\``)
        .replace("%CATEGORY", `\`${badge.category}\``)

        .replace("%DESCRIPTION", `*${badge.description}*`);
}

module.exports = {
    badges, setIDs: arrayTools.unique(badges.map(badge => badge.setID)),

    get: {
        badgeID: get_badgeID
    },

    parse: {
        toBadgeLike: parse_toBadgeLike,
        fromBadgeLike: parse_fromBadgeLike
    },

    toString: {
        basic: toString_basic,
        profile: toString_profile,
        setEntry: toString_setEntry,
        shopEntry: toString_shopEntry
    }
};