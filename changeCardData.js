const fs = require('fs');

const logger = require('./modules/logger');

const cards = {
    cards_bday: require('./items/cards/cards_bday.json'),
    cards_common: require('./items/cards/cards_common.json'),
    cards_custom: require('./items/cards/cards_custom.json'),
    cards_epic: require('./items/cards/cards_epic.json'),
    cards_event1: require('./items/cards/cards_event1.json'),
    cards_event2: require('./items/cards/cards_event2.json'),
    cards_event3: require('./items/cards/cards_event3.json'),
    cards_holiday: require('./items/cards/cards_holiday.json'),
    cards_mint: require('./items/cards/cards_mint.json'),
    cards_rare: require('./items/cards/cards_rare.json'),
    cards_season: require('./items/cards/cards_season.json'),
    cards_shop: require('./items/cards/cards_shop.json'),
    cards_uncommon: require('./items/cards/cards_uncommon.json')
};

let card_entries = Object.entries(cards);

for (let entry of card_entries) {
    let _cards = cards[entry[0]];

    for (let i = 0; i < _cards.length; i++) {
        let card = _cards[i];

        if (["229", "249"].includes(card.setID)) cards[entry[0]][i].category = "holi";
    }

    // Parse the object into a string
    logger.log("converting into JSON...");
    let jsonData = JSON.stringify(entry[1], null, 2);

    // Save the file
    logger.log("writing file...");
    fs.writeFile(`./items/cards/${entry[0]}.json`, jsonData, (err) =>
        err ? logger.error(`Failed to save ${fn}`, "could not write", err) : null
    );

    logger.success(`file saved: \`${entry[0]}.json\``);
}