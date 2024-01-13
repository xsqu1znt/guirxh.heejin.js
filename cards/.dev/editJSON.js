// Description Format | card_JSON[i].cards[i].description = `**${_c.single}** *\`${_c.group}\`*`;

const fs = require("fs");
const jt = require("../../modules/jsTools");

const card_JSON = [
	{ fn: "common", cards: require("./.current/cards_common.json") },
	{ fn: "uncommon", cards: require("./.current/cards_uncommon.json") },
	{ fn: "rare", cards: require("./.current/cards_rare.json") },
	{ fn: "epic", cards: require("./.current/cards_epic.json") },
	{ fn: "mint", cards: require("./.current/cards_mint.json") },

	{ fn: "bday", cards: require("./.current/cards_bday.json") },
	{ fn: "holiday", cards: require("./.current/cards_holiday.json") },

	{ fn: "event1", cards: require("./.current/cards_event1.json") },
	{ fn: "event2", cards: require("./.current/cards_event2.json") },
	{ fn: "event3", cards: require("./.current/cards_event3.json") },

	{ fn: "season", cards: require("./.current/cards_season.json") },
	{ fn: "shop", cards: require("./.current/cards_shop.json") },
	{ fn: "custom", cards: require("./.current/cards_custom.json") }
];

function exportAll() {
	for (let file of card_JSON) {
		// Stringify the JSON
		let stringify = JSON.stringify(file.cards, null, 4);

		// Write the file
		fs.writeFileSync(`./cards/${file.fn}.json`, stringify, err => console.error(err));
		console.log(`modified card JSON exported as '${file.fn}.json'`);
	}
}

function modifyCards() {
	// Iterate through card JSONs
	for (let i = 0; i < card_JSON.length; i++) {
		let _cards = card_JSON[i].cards;

		// Iterate through cards in the JSON
		for (let idx = 0; idx < _cards.length; idx++) {
			let _c = _cards[idx];

			// Modify the description format
			// card_JSON[i].cards[idx].description = `**${_c.single}** *\`${_c.group}\`*`;

			if (_c.setID === 120) card_JSON[i].cards[idx].description = `**LOONA Solo** *\`Individuals\`*`
			if (_c.setID === 121) card_JSON[i].cards[idx].description = `**LOONA B-Sides** *\`Special\`*`
			if (_c.setID === 122) card_JSON[i].cards[idx].description = `**LOONA Solo** *\`Special\`*`
			if (_c.setID === 199) card_JSON[i].cards[idx].description = `**Special** *\`Solo\`*`
			if (_c.setID === 200) card_JSON[i].cards[idx].description = `**Special** *\`Loossemble\`*`
			if (_c.setID === 201) card_JSON[i].cards[idx].description = `**Special** *\`ARTMS\`*`
		}
	}
}

modifyCards();
exportAll();
