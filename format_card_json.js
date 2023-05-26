/* const fs = require('fs');

let cards = require('./cards.json');
cards = cards.sort((a, b) => a.SetID - b.SetID);

let cards_formated = [];

for (let card of cards) cards_formated.push({
    name: card.Name,
    group: card.Group,
    single: card.Single,
    category: card.Category,
    description: card.Description,
    emoji: card.Emoji,

    // uid: "",
    globalID: String(card.GlobalID),
    setID: String(card.SetID),
    rarity: card.Rarity,
    price: card.Price,
    sellPrice: card.SellPrice,

    stats: {
        level: card.Level,
        xp: 0,
        xp_for_next_level: 100,

        ability: card.Ability,
        reputation: card.Reputation
    },

    imageURL: card.ImageRoot
});

let jsonData = JSON.stringify(cards_formated, null, 2);
fs.writeFile("cards_formated.json", jsonData, function (err) {
    if (err) {
        console.log(err);
    }
});

console.log("done"); */

const cardManager = require('./modules/cardManager');

module.exports = formatCard = (card, uid = "") => {
    card = {
        name: card.Name,
        group: card.Group,
        single: card.Single,
        category: card.Category,
        description: card.Description,
        emoji: card.Emoji,

        uid: String(uid),
        globalID: String(card.GlobalID),
        setID: String(card.SetID),
        rarity: card.Rarity,
        price: card.Price,
        sellPrice: card.SellPrice,

        stats: {
            level: card.Level,
            xp: card.Xp,
            xp_for_next_level: 100,

            ability: card.Ability,
            reputation: card.Reputation
        },

        imageURL: card.ImageRoot
    };


    if (card.stats.level > 1)
        card = cardManager.recalculateStats(card);

    return card;
}