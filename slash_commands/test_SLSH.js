const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed, markdown } = require("../modules/discordTools");
const { userManager, questManager } = require("../modules/mongo/index");
const jt = require("../modules/jsTools");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		throw new Error("hah, gotcha!");
	}
};
