const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _dsT = require("../modules/discordTools/_dsT");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let embed = new BetterEmbed({ interaction, description: "boop" });

		/*
		- ORIGINAL -
		let card_categories = cardManager.cards.category.names.all.map(cat => {
			let _cards = cardManager.cards.all.filter(c => c.category === cat).map(c => c.globalID);
			return { category: cat, cards: _jsT.chunk(_cards, 10) };
		}); */

		// let cards = [...cardManager.cards.base.cust, ...cardManager.cards.base.shop];
		let cards = [...cardManager.cards.base.evnt];

		/// Gather card global IDs
		let card_categories = [];

		for (let cat of cardManager.cards.category.names.all) {
			/// Parse the global IDs found into a format that includes its category name on the first element in the category
			let _globalIDs = cards.filter(c => c.category === cat).map(c => ({ name: "", globalID: c.globalID }));

			// NOTE: only pushes to the array if there were global IDs found
			if (_globalIDs.length) {
				// Gets the first element in the array and appends its category name
				let _globalID_first = { ..._globalIDs.shift(), name: cat };
				// Pushes to the main array
				card_categories.push(...[_globalID_first, ..._globalIDs]);
			}
		}

		/// Split global IDs by category, with a max of 5 cards per group
		let card_categories_split = [];
		let row_size = 5;

		for (let i = 0; i < card_categories.length;) {
			// Get the base row size of 5
			let size = row_size;

			// Get an array of the next 5 entries
			let chunk_test = card_categories.slice(i, i + size);
			// Check if it contains an entrie with a category name
			let chunk_test_idx = chunk_test.findIndex(c => c.name);

			// Cut the row size down to the index of an entry before the category name
			// we don't need to subtract 1 from here to get the entry before index because we're using .slice() 
			if (chunk_test_idx > 0) size = chunk_test_idx;

			// Push the resulting chunk to the array
			// since we're using .slice(), we need to make sure the size isn't 0 (the index of .findIndex())
			card_categories_split.push(chunk_test.slice(0, size || 1));

			// Increment i by size, defaulting to row size if 0 (the index of .findIndex())
			i += size || row_size;
		}

		return await embed.send();
	}
};
