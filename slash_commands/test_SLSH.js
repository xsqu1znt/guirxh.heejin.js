const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const itemManager = require("../modules/itemManager");
const _dsT = require("../modules/discordTools");
const _jsT = require("../modules/jsTools");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let card = cardManager.get.random({ count: 1 });

		let embed = new BetterEmbed({ interaction, description: cardManager.toString.basic(card) });

		return await embed.send();
	}
};
