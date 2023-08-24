const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const _jsT = require("../modules/jsTools/_jsT");
const userManager = require("../modules/mongo/index");
const Stage = require("../modules/stage");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

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
