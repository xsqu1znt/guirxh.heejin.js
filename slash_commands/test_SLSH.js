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
		let embed_beep = new BetterEmbed({
			interaction,
			title: "```title codeblock``` | `title inline codeblock`",
			author: { text: "```author codeblock``` | `author inline codeblock`" },
			description: "```description codeblock```\n`description inline codeblock`"
		});
		return await embed_beep.send();
	}
};
