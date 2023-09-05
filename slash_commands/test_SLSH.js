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
		/* let embed = new BetterEmbed({
			interaction, author: { text: "$USERNAME | missing", iconURL: true },
			description: "```TESTING```"
		}); */

		/* // `🗣️ 120`
		let row_1 = [
			"> `owned ✔️` **`1201`**\n> `🐰` **ViViD** `LOONA Solo` - [HeeJin](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `missing ❌` **`1205`**\n> `🦌` **Everyday I Love You** `LOONA Solo` - [ViVi](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `missing ❌` **`1210`**\n> `🐧` **Heart Attack** `LOONA Solo` - [Chuu](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)"
		];

		let row_2 = [
			"> `missing ❌` **`1203`**\n> `🐦` **Let Me In** `LOONA Solo` - [HaSeul](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `missing ❌` **`1205`**\n> `🐰` **ViViD** `LOONA Solo` - [HeeJin](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `owned ✔️` **`1207`**\n> `🐟` **Singing In The Rain** `LOONA Solo` - [JinSoul](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)"
		];

		let row_3 = [
			"> `missing ❌` **`1203`**\n> `🐦` **Let Me In** `LOONA Solo` - [HaSeul](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `missing ❌` **`1207`**\n> `🐟` **Singing In The Rain** `LOONA Solo` - [JinSoul](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)",
			"> `missing ❌` **`1210`**\n> `🐧` **Heart Attack** `LOONA Solo` - [Chuu](https://cdn.discordapp.com/attachments/1014199645750186044/1035715810200670319/vivid_heejin.png)"
		];

		embed.addFields(
			{ name: "`⬜` ***SET 120***", value: row_1.join("\n\n"), inline: true },

			{ name: "\u200b", value: row_2.join("\n\n"), inline: true },

			{ name: "\u200b", value: row_3.join("\n\n"), inline: true }
		);

		return await embed.send(); */

		let embed = new BetterEmbed({
			interaction,
			author: { text: "$USERNAME | test", iconURL: true },
			description: "```	 boop```"
		});

		/*
		- ORIGINAL -
		let card_categories = cardManager.cards.category.names.all.map(cat => {
			let _cards = cardManager.cards.all.filter(c => c.category === cat).map(c => c.globalID);
			return { category: cat, cards: _jsT.chunk(_cards, 10) };
		}); */

		// let cards = [...cardManager.cards.base.cust, ...cardManager.cards.base.shop];
		let cards = cardManager.cards.all;

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

		for (let i = 0; i < card_categories.length; ) {
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
			console.log(chunk_test.slice(0, size || 1));

			// Increment i by size, defaulting to row size if 0 (the index of .findIndex())
			i += size || row_size;
		}

		// console.log(card_categories_split);

		return await embed.send();
	}
};
