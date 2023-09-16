const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const itemManager = require("../modules/itemManager");
const _dsT = require("../modules/discordTools/_dsT");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let embed = new BetterEmbed({ interaction, description: "boop" });

		let charm = itemManager.items.charms[0].charms[0];
		charm.type = itemManager.items.charms[0].type;
		charm.expiration = _jsT.parseTime("7d", { fromNow: true });
		await userManager.charms.set(interaction.user.id, charm);

		console.log(charm);
		// let _charm = await userManager.charms.get(interaction.user.id, "dupe_repellent");

		return await embed.send();
	}
};
