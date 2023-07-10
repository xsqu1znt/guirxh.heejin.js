const botConfig = require('../configs/config_bot.json');

const { arrayTools } = require('./jsTools');

const itemPacks = require('../items/item_packs.json');

function get_packID(packID) {
    return structuredClone(itemPacks.find(pack => pack.id === packID)) || null;
}

function get_setID(setID) {
    return structuredClone(itemPacks.filter(pack => pack.setID === setID)) || [];
}

function toString_setEntry(setID) {
    let set_itemPack = get_setID(setID); if (!set_itemPack.length) return "n/a";
    let set_itemPack_first = set_itemPack.slice(-1)[0];

    let count = set_itemPack.length >= 10 ? set_itemPack.length : `0${set_itemPack.length}`;

    return "%SET_ID %ITEMPACK_COUNT %CATEGORY %EMOJI %SET"
        .replace("%SET_ID", `\`🗣️ ${set_itemPack_first.setID}\``)

        .replace("%ITEMPACK_COUNT", `\`📁 ${count}\``)

        .replace("%CATEGORY", `\`${set_itemPack_first.category}\``)
        .replace("%EMOJI", `\`${set_itemPack_first.emoji}\``)
        .replace("%SET", `**${set_itemPack_first.set}**`);
}

function toString_shopEntry(packID) {
    let _itemPack = get_packID(packID); if (!_itemPack) return "n/a";

    return "\`%ID\` **%SET** :: *%NAME* \`%PRICE\`\n> \`%SET_ID\` \`%RARITY\` \`%CATEGORY\`\n> *%DESCRIPTION*"
        .replace("%ID", _itemPack.id)
        .replace("%SET", _itemPack.set)
        .replace("%NAME", _itemPack.name)
        .replace("%PRICE", `${botConfig.emojis.CURRENCY_1.EMOJI} ${_itemPack.price}`)

        .replace("%SET_ID", `🗣️ ${_itemPack.setID}`)
        .replace("%RARITY", `RB${_itemPack.rarity}`)
        .replace("%CATEGORY", _itemPack.category)

        .replace("%DESCRIPTION", _itemPack.description);
}

module.exports = {
    itemPacks, setIDs: arrayTools.unique(itemPacks.map(pack => pack.setID)),

    get: {
        packID: get_packID,
        setID: get_setID
    },

    toString: {
        setEntry: toString_setEntry,
        shopEntry: toString_shopEntry
    }
};