const fs = require("fs");

const logger = require("../../modules/logger");

const cards = {
	// cards_bday: require('../../items/cards/cards_bday.json'),
	// cards_common: require('../../items/cards/cards_common.json'),
	// cards_custom: require('../../items/cards/cards_custom.json'),
	// cards_epic: require('../../items/cards/cards_epic.json'),
	// cards_event1: require("../../items/cards/cards_event1.json"),
	// cards_event2: require("../../items/cards/cards_event2.json"),
	// cards_event3: require("../../items/cards/cards_event3.json")
	// cards_holiday: require('../../items/cards/cards_holiday.json'),
	// cards_mint: require('../../items/cards/cards_mint.json'),
	// cards_rare: require('../../items/cards/cards_rare.json'),
	// cards_season: require('../../items/cards/cards_season.json'),
	cards_shop: require('../../items/cards/cards_shop.json'),
	// cards_uncommon: require('../../items/cards/cards_uncommon.json')
};

let card_keys = Object.keys(cards);
let card_values = Object.values(cards);

for (let i = 0; i < card_values.length; i++) {
	card_values[i].forEach((_card, idx) => {
		// card_values[i][idx].description = `**${_card.group}** \`Holiday\``;
        if (_card.category === "pets") card_values[i][idx].category = "shop";
        if (_card.category === "gold") card_values[i][idx].category = "shop";
	});

	// Parse the object into a string
	logger.log("converting into JSON...");
	let jsonData = JSON.stringify(card_values[i], null, 2);

	// Save the file
	logger.log("writing file...");
	fs.writeFile(`./items/cards/${card_keys[i]}.json`, jsonData, err =>
		err ? logger.error(`Failed to save ${card_keys[i]}.json`, "could not write", err) : null
	);

	logger.success(`file saved: \`${card_keys[i]}.json\``);
}
