const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		let embed = new BetterEmbed({
			interaction, /* author: { text: "$USERNAME | inventory", iconURL: true }, */
		});

		/* embed.addFields(
			{
				name: "\u200b",
				value: ">>>>>>\n>>> ```> 🔴 **`COMN`** :: *`343/368`*\n> 🟡 **`UNCN`** :: *`343/368`*\n> 🟢 **`RARE`** :: *`343/368`*\n> 🔵 **`EPIC`** :: *`343/368`*\n> 🟣 **`MINT`** :: *`343/368`*\n> ⚪ **`TOTAL`** :: *`1243/2183`*```",
				inline: true
			},
			{
				name: "\u200b",
				value: ">>>>>>\n>>> ```> 🟥 **`BDAY`** :: *`343/368`* \n> ⬜ **`CUST`** :: *`343/368`*\n> 🟨 **`HOLI`** :: *`343/368`*\n> 🟩 **`EVNT`** :: *`343/368`*\n> 🟦 **`SEAS`** :: *`343/368`*\n> 🟪 **`SHOP`** :: *`343/368`*```",
				inline: true
			},

			{
				name: "\u200b",
				value: "```🥕 16529 :: 🎀 0 :: 🃏 56/2448 :: 📈 LV. 1 ☝️ 1629XP/50XP```",
				inline: false
			},
			{
				name: "\u200b",
				value: "> **`5ZM83A`** `5673` `🗣️856`\n> `🏫` **Future Perfect** :: `ENHYPEN` Heeseung\n> `LV. 1` `comn` `💰 45`\n> `🎤 100` : `💖 100`",
				inline: true
			}
			// { name: "\u200b", value: "\u200b", inline: true },
			// { name: "\u200b", value: "\u200b", inline: true }
		); */

		return await embed.send();
	}
};
