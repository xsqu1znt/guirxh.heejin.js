const fs = require('fs');

const { arrayTools } = require('./modules/jsTools');
const cards = require('./cards_20_5_2023.json');

const rarities = {
    common: 70,
    uncommon: 60,
    rare: 50,
    epic: 40,
    mint: 30,

    custom: 100,
    shop: { min: 101, max: 104 }
};

const cards_category = {
    common: cards.filter(card => card.rarity === rarities.common),
    uncommon: cards.filter(card => card.rarity === rarities.uncommon),
    rare: cards.filter(card => card.rarity === rarities.rare),
    epic: cards.filter(card => card.rarity === rarities.epic),
    mint: cards.filter(card => card.rarity === rarities.mint),

    seasonal: cards.filter(card => ["161", "162"].includes(card.setID)),
    holiday: cards.filter(card => ["229", "241", "249"].includes(card.setID)),
    bday: cards.filter(card => ["230", "231"].includes(card.setID)),

    event: cards.filter(card => ["120", "232", "233", "234", "235", "236", "237", "238", "239", "240",
        "242", "243", "244", "248", "247", "246", "245", "224", "225", "226",
        "227", "228"].includes(card.setID)),

    custom: cards.filter(card => card.rarity === rarities.custom),
    shop: cards.filter(card => card.rarity >= rarities.shop.min && card.rarity <= rarities.shop.max)
};

const split = (cardArr = [], size) => {
    let grouped = [];
    let setIDs = [];

    cardArr.forEach(card => {
        if (!setIDs.find(s => s === card.setID)) setIDs.push(card.setID);
    });

    setIDs = arrayTools.chunk(setIDs, size);

    for (let groupOfSetIDs of setIDs) {
        let _cards = [];

        groupOfSetIDs.forEach(setID => _cards = [..._cards, ...cardArr.filter(card => card.setID === setID)]);
        grouped.push(_cards);
    }

    return grouped;
};

let cards_toJSON = [
    { name: "common", json: JSON.stringify(cards_category.common, null, 4) },
    { name: "uncommon", json: JSON.stringify(cards_category.uncommon, null, 4) },
    { name: "rare", json: JSON.stringify(cards_category.rare, null, 4) },
    { name: "epic", json: JSON.stringify(cards_category.epic, null, 4) },
    { name: "mint", json: JSON.stringify(cards_category.mint, null, 4) },

    { name: "seasonal", json: JSON.stringify(cards_category.seasonal, null, 4) },
    { name: "holiday", json: JSON.stringify(cards_category.holiday, null, 4) },
    { name: "bday", json: JSON.stringify(cards_category.bday, null, 4) },

    { name: "event", json: split(cards_category.event, 10).map(card_group => JSON.stringify(card_group, null, 4)) },

    { name: "custom", json: JSON.stringify(cards_category.custom, null, 4) },
    { name: "shop", json: JSON.stringify(cards_category.shop, null, 4) },
];

for (let data of cards_toJSON) {
    let foo = (err) => { if (err) console.error(err); };

    if (!Array.isArray(data.json)) fs.writeFile(`cards_${data.name}.json`, data.json, foo);
    else data.json.forEach((j, idx) => fs.writeFile(`cards_${data.name}${idx + 1}.json`, j, foo));
}