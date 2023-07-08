const { botSettings } = require('../configs/heejinSettings.json');
const { markdown: { bold, italic, inline, link } } = require('./discordTools');

const badges = require('../items/badges.json');

function get_badgeID(id) {
    return structuredClone(badges.find(badge => badge.id.toLowerCase() === id)) || null;
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

module.exports = {
    badges,

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
        shop: toString_shop
    }
};