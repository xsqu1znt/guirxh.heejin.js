const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "🎤", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("stage")
        .setDescription("LV. your idol by challenging a rival to a duel"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		//
	}
};
