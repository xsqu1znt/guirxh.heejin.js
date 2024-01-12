const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { user_ES } = require("../../modules/embedStyles/index");
const { userManager } = require("../../modules/mongo/index");

module.exports = {
	options: { icon: "⏲️", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("cooldowns")
        .setDescription("Check your cooldowns"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let userData = await userManager.fetch(interaction.user.id, { type: "reminder" });
		let embed_cooldowns = user_ES.cooldowns(interaction.member, userData);

		return await embed_cooldowns.send({ interaction });
	}
};
