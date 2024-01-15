// Description Format | card_JSON[i].cards[i].description = `**${_c.single}** *\`${_c.group}\`*`;

const fs = require("fs");
const jt = require("../../modules/jsTools");

const card_JSON = [
	{ fn: "common", cards: require("./.current/common.json") },
	{ fn: "uncommon", cards: require("./.current/uncommon.json") },
	{ fn: "rare", cards: require("./.current/rare.json") },
	{ fn: "epic", cards: require("./.current/epic.json") },
	{ fn: "mint", cards: require("./.current/mint.json") },

	{ fn: "bday", cards: require("./.current/bday.json") },
	{ fn: "holiday", cards: require("./.current/holiday.json") },

	{ fn: "event1", cards: require("./.current/event1.json") },
	{ fn: "event2", cards: require("./.current/event2.json") },
	{ fn: "event3", cards: require("./.current/event3.json") },

	{ fn: "season", cards: require("./.current/season.json") },
	{ fn: "shop", cards: require("./.current/shop.json") },
	{ fn: "custom", cards: require("./.current/custom.json") }
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

function editCardDescriptions() {
	// Iterate through card JSONs
	for (let i = 0; i < card_JSON.length; i++) {
		let _cards = card_JSON[i].cards;

		// Iterate through cards in the JSON
		for (let idx = 0; idx < _cards.length; idx++) {
			let _c = _cards[idx];

			// Modify the description format
			card_JSON[i].cards[idx].description = `**${_c.single}** *\`${_c.group}\`*`;

			/* - - - - - { Special Card Descriptions } - - - - - */
			if (_c.setID === "100") card_JSON[i].cards[idx].description = `**Special** *\`Custom\`*`;

			if (_c.setID === "101") card_JSON[i].cards[idx].description = `**Shop** *\`Holo\`*`;
			if (_c.setID === "102") card_JSON[i].cards[idx].description = `**Shop** *\`Flower\`*`;
			if (_c.setID === "103") card_JSON[i].cards[idx].description = `**Shop** *\`Polaroid\`*`;
			if (_c.setID === "104") card_JSON[i].cards[idx].description = `**Shop** *\`Suit\`*`;
			if (_c.setID === "105") card_JSON[i].cards[idx].description = `**Shop** *\`Kid\`*`;
			if (_c.setID === "106") card_JSON[i].cards[idx].description = `**Shop** *\`Pets\`*`;
			if (_c.setID === "151") card_JSON[i].cards[idx].description = `**Shop** *\`Gold\`*`;

			if (_c.setID === "161") card_JSON[i].cards[idx].description = `**Season** *\`WINTER23\`*`;
			if (_c.setID === "162") card_JSON[i].cards[idx].description = `**Season** *\`SPRING23\`*`;
			if (_c.setID === "163") card_JSON[i].cards[idx].description = `**Season** *\`SUMMER23\`*`;

			if (_c.setID === "202") card_JSON[i].cards[idx].description = `**Special** *\`K-Actress\`*`;

			if (_c.setID === "120") card_JSON[i].cards[idx].description = `**LOONA Solo** *\`Individuals\`*`;
			if (_c.setID === "121") card_JSON[i].cards[idx].description = `**LOONA B-Sides** *\`Special\`*`;
			if (_c.setID === "122") card_JSON[i].cards[idx].description = `**LOONA Solo** *\`Special\`*`;

			if (_c.setID === "199") card_JSON[i].cards[idx].description = `**Special** *\`Solo\`*`;
			if (_c.setID === "200") card_JSON[i].cards[idx].description = `**Special** *\`Loossemble\`*`;
			if (_c.setID === "201") card_JSON[i].cards[idx].description = `**Special** *\`ARTMS\`*`;
		}
	}
}

function resortCards() {
	// Iterate through card JSONs
	for (let i = 0; i < card_JSON.length; i++) {
		let _cards = card_JSON[i].cards;

		// Iterate through cards in the JSON
		for (let idx = 0; idx < _cards.length; idx++) {
			// let _c = _cards[idx];

			card_JSON[i].cards.sort((a, b) => a.globalID - b.globalID);
		}
	}
}

// editCardDescriptions();
// resortCards();
// exportAll();
