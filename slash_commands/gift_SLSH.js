const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { userManager } = require("../modules/mongo/index");
const messenger = require("../modules/messenger");
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

		/// Fetch the cards from the user's card_inventory
		let cards = await userManager.inventory.get(interaction.user.id, { uids });

		// prettier-ignore
		// Let the user know no cards were found using those UIDs
		if (!cards.length) return await error_ES.send({
			interaction, description: `No cards were found with ${uids.length === 1 ? "that UID" : "those UIDs"}`
		});

		// prettier-ignore
		// Filter out locked/favorited/selected/team cards
		cards = cards.filter(c =>
            !c.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
		);

		// prettier-ignore
		// Let the user know they tried to sell locked/favorited/selected/team cards
		if (!cards.length) return await error_ES.send({
			interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be sold, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
		});

		// Create the embed :: { GIFT }
		let embed_gift = general_ES.gift(interaction.member, recipient, cards);

		await Promise.all([
			// Remove the cards from the user's card_inventory
			userManager.inventory.remove(interaction.user.id, uids),
			// Add the cards to the recipient card_inventory
			userManager.inventory.add(recipient.id, uids),
			// Update the recipient's quest progress
			userManager.quest.progress.increment.inventory(recipient.id, cards.length),
			// Send a DM to the recipient
			messenger.gift.cards(interaction.member, recipient, cards),
			// Send the embed :: { GIFT }
			embed_gift.send({ interaction })
		]);
	}
};
