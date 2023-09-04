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

		let cards = [...cardManager.cards.base.cust, ...cardManager.cards.base.shop];

		let card_categories = [];

		for (let cat of cardManager.cards.category.names.all) {
			let _globalIDs = cards.filter(c => c.category === cat).map(c => ({ name: "", globalID: c.globalID }));

			let _globalID_first = { ..._globalIDs.shift(), name: cat };

			card_categories.push(...[_globalID_first, ..._globalIDs]);
		}

		// prettier-ignore
		/* let card_categories = cardManager.cards.category.names.all.map(cat => {
			let globalIDs = cards.filter(c => c.category === cat).map(c => c.globalID);

			return { name: cat, globalIDs: _jsT.chunk(globalIDs, 5), count: globalIDs.length };
			
		}).filter(cat => cat.count); */

		console.log(card_categories);

		return await embed.send();
	}
};
