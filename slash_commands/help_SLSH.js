const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require(`../modules/discordTools/_dsT`);

module.exports = {
	options: { deferReply: false, dontRequireUserData: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("help")
        .setDescription("Get information about the commands"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// prettier-ignore
		let embed_help = new BetterEmbed({
			interaction, author: { text: "$USERNAME | help", user: interaction.member }
		});

		// Create an array out of the slash commands that have icons
		let slashCommands = [...client.slashCommands.values()].filter(slsh => slsh?.options?.icon);


		// prettier-ignore
		// Iterate through each slash command and add it to the embed
		for (let _slsh of slashCommands) embed_help.addFields({
            name: `\`${_slsh.options.icon}\` ${_slsh.builder.name}`,
            value: `> ${_slsh.builder.description}`, inline: true
        });

		// Send the embed
		return await embed_help.send();
	}
};
