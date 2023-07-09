const { botSettings } = require('../configs/heejinSettings.json');
const { markdown: { bold, italic, inline, link } } = require('./discordTools');

const badges = require('../items/badges.json');
const { arrayTools } = require('./jsTools');

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
    return { ...getBadgeByID(badgeLike.id.toLowerCase()), ...badgeLike };
}

function toString_basic(badge) {
    return "%EMOJI %SET :: %NAME"
        .replace("%EMOJI", badge.emoji)
        .replace("%SET", bold(true, badge.set))
        .replace("%NAME", italic(true, link(badge.name, badge.emojiURL, badge.description)));
}

function toString_profile(badge) {
    return inline(true, "%EMOJI %SET %NAME")
        .replace("%EMOJI", badge.emoji)
        .replace("%SET", badge.set)
        .replace("%NAME", badge.name);
}

function toString_shop(badge) {
    return "%ID %EMOJI %SET :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY\n> %DESCRIPTION"
        .replace("%ID", inline(true, badge.id))
        .replace("%EMOJI", badge.emoji)
        .replace("%NAME", italic(true, link(badge.name, badge.emojiURL, badge.description)))
        .replace("%PRICE", inline(true, botSettings.currencyIcon, badge.price))

        .replace("%SET_ID", inline(true, "🗣️", badge.setID))
        .replace("%SET", bold(true, badge.set))
        .replace("%RARITY", inline(false, "RB", badge.rarity))
        .replace("%CATEGORY", inline(true, badge.category))

        .replace("%DESCRIPTION", italic(true, badge.description));
}

function toString_setEntry(setID) {
    let set_badges = get_setID(setID); if (!set_badges.length) return "n/a";
    let set_badges_first = set_badges.slice(-1)[0];

    let count = set_badges.length >= 10 ? set_badges.length : `0${set_badges.length}`;

    return "%SET_ID %BADGE_COUNT %CATEGORY %EMOJI %SET"
        .replace("%SET_ID", `\`🗣️ ${set_badges_first.setID}\``)

        .replace("%BADGE_COUNT", `\`📁 ${count}\``)

        .replace("%CATEGORY", `\`${set_badges_first.category}\``)
        .replace("%EMOJI", `\`${set_badges_first.emoji}\``)
        .replace("%SET", `**${set_badges_first.set}**`);
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
        shop: toString_shop,
        setEntry: toString_setEntry
    }
};