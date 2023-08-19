const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const _jsT = require("../modules/jsTools/_jsT");

const config_player = require("../configs/config_player.json");

module.exports = {
	options: { icon: "🎁", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("gift")
        .setDescription("Gift a card to another player")
    
        .addUserOption(option => option.setName("player").setDescription("The player you want to gift to").setRequired(true))
        .addStringOption(option => option.setName("uids").setDescription("UID of the card, separate by comma").setRequired(true)),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let uids = _jsT.isArray(interaction.options.getString("uids").replace(/ /g, "").split(","));

		let recipient = interaction.options.getUser("player");

		// prettier-ignore
		// A player can't gift cards to themselves
		if (recipient.id === interaction.user.id) return await error_ES.send({
            description: "You cannot gift to yourself, silly!", ephemeral: true
        });

		// prettier-ignore
		// Check if the recipient player started
		if (!await userManager.exists(recipient.id)) return await error_ES.send({
            interaction, description: "That user has not started yet", ephemeral: true
        });

		// Defer the interaction
		await interaction.deferReply();

		// Fetch the user from Mong
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		// Fetch the cards from the user's card_inventory
        let cards = await userManager.inventory.get(interaction.user.id, { uids });
        // if (!cards.length)
	}
};
