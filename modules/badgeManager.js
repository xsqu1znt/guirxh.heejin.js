const badges = require('../items/badges.json');

const { botSettings } = require('../configs/heejinSettings.json');
const { markdown } = require('./discordTools');
const { bold, italic, inline, quote, link, space } = markdown;

function get(id) {
    return badges.find(badge => badge.id === id) || null;
}

function toString(badge) {
    return "%ID %EMOJI :: %NAME %PRICE\n> %SET_ID %RARITY %CATEGORY"
        .replace("%ID", inline(true, badge.id))
        .replace("%EMOJI", badge.emoji)
        .replace("%NAME", bold(true, link(badge.name, badge.emojiURL, badge.description)))
        .replace("%PRICE", inline(true, botSettings.currencyIcon, badge.price))

        .replace("%SET_ID", inline(true, "🗣️", badge.setID))
        .replace("%RARITY", inline(false, "R", badge.rarity))
        .replace("%CATEGORY", inline(true, badge.category));
}

module.exports = { badges, get, toString };