// Description Format | card_JSON[i].cards[i].description = `**${_c.single}** *\`${_c.group}\`*`;

const fs = require("fs");
const jt = require("../modules/jsTools");

const card_JSON = [
	{ fn: "common", cards: require("./.current/cards_common.json") },
	// { fn: "uncommon", cards: require("./.current/cards_uncommon.json") },
	// { fn: "rare", cards: require("./.current/cards_rare.json") },
	// { fn: "epic", cards: require("./.current/cards_epic.json") },
	// { fn: "mint", cards: require("./.current/cards_mint.json") },

	// { fn: "bday", cards: require("./.current/cards_bday.json") },
	// { fn: "holiday", cards: require("./.current/cards_holiday.json") },

	// { fn: "event1", cards: require("./.current/cards_event1.json") },
	// { fn: "event2", cards: require("./.current/cards_event2.json") },
	// { fn: "event3", cards: require("./.current/cards_event3.json") },

	// { fn: "season", cards: require("./.current/cards_season.json") },
	// { fn: "shop", cards: require("./.current/cards_shop.json") },
	// { fn: "custom", cards: require("./.current/cards_custom.json") }
];

function exportAll() {
	for (let file of card_JSON) {
		// Stringify the JSON
		let stringify = JSON.stringify(file.cards, null, 4);

		// Write the file
		fs.writeFileSync(`${file.fn}.json`, stringify, err => console.error(err));
	}
}

function modifyCards() {
	// Iterate through card JSONs
	for (let i = 0; i < card_JSON.length; i++) {
		let _cards = card_JSON[i].cards;

		// Iterate through cards in the JSON
		for (let i = 0; i < _cards.length; i++) {
			let _c = _cards[i];

			// Modify the description format
			card_JSON[i].cards[i].description = `**${_c.single}** *\`${_c.group}\`*`;
		}
	}
}

modifyCards();
exportAll();