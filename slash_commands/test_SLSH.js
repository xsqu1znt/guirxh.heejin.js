const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let embed_beep = new BetterEmbed({ interaction });

		let stuff = [
			"> `🗣️ 101` `📁 04` `cust` `📝` **Custom** :: CUST01",
			"> `🗣️ 102` `📁 04` `cust` `📝` **Custom** :: CUST02",
			"> `🗣️ 103` `📁 06` `cust` `📝` **Custom** :: CUST03",
			"> `🗣️ 101` `📁 04` `cust` `📝` **Custom** :: CUST01",
			"> `🗣️ 102` `📁 04` `cust` `📝` **Custom** :: CUST02",
			"> `🗣️ 103` `📁 06` `cust` `📝` **Custom** :: CUST03",
			"> `🗣️ 101` `📁 04` `cust` `📝` **Custom** :: CUST01",
			"> `🗣️ 102` `📁 04` `cust` `📝` **Custom** :: CUST02",
			"> `🗣️ 103` `📁 06` `cust` `📝` **Custom** :: CUST03",
			"> `🗣️ 101` `📁 04` `cust` `📝` **Custom** :: CUST01"
		];

		embed_beep.addFields(
			{ name: "`🟣` ***Mint***", value: stuff.join("\n"), inline: true },
			// { name: "`🟣` ***Mint***", value: stuff.slice(0, 4).join("\n"), inline: true },
			// { name: "`🔵` ***Epic***", value: stuff.join("\n"), inline: true },
			// { name: "`🔵` ***Epic***", value: stuff.join("\n"), inline: true },
			// { name: "`🟢` ***Rare***", value: stuff.join("\n"), inline: true },
			// { name: "`🟢` ***Rare***", value: stuff.join("\n"), inline: true }
		);

		return await embed_beep.send();
	}
};
