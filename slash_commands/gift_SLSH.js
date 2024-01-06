const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager, questManager } = require("../modules/mongo/index");
const messenger = require("../modules/messenger");
const jt = require("../modules/jsTools");

module.exports = {
	options: { icon: "🎁", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("gift")
        .setDescription("Gift a card to another player")
    
        .addUserOption(option => option.setName("player").setDescription("Player you want to gift to").setRequired(true))
        .addStringOption(option => option.setName("uids").setDescription("UID of the card, separate by comma").setRequired(true)),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let recipient = interaction.options.getUser("player");
		let uids = jt.isArray(interaction.options.getString("uids").replace(/ /g, "").split(","));

		// prettier-ignore
		// A player can't gift cards to themselves
		if (recipient.id === interaction.user.id) return await error_ES.send({
            description: "You cannot gift to yourself, silly!", ephemeral: true
        });

		// Defer the interaction
		await interaction.deferReply();

		// prettier-ignore
		// Check if the recipient player started
		if (!await userManager.exists(recipient.id)) return await error_ES.send({
            interaction, description: `${recipient} has not started yet`
        });

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		/// Fetch the cards from the user's card_inventory
		let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

		// prettier-ignore
		// Let the user know no cards were found using those UIDs
		if (!cards.length) return await error_ES.send({
			interaction, description: `No cards were found with ${uids.length === 1 ? "that UID" : "those UIDs"}`
		});

		// prettier-ignore
		// Filter out locked/favorited/selected/team cards
		cards = cards.filter(c =>
            !c?.locked && ![userData.card_favorite_uid, userData.card_selected_uid, ...userData.card_team_uids].includes(c.uid)
		);

		// prettier-ignore
		// Let the user know they tried to sell locked/favorited/selected/team cards
		if (!cards.length) return await error_ES.send({
			interaction, description: `${uids.length === 1 ? "That card" : "Those cards"} cannot be gifted, it is either:\n\`🔒 vault\` \`🧑🏾‍🤝‍🧑 team\` \`🏃 idol\` \`⭐ favorite\``
		});

		// Create the embed :: { GIFT }
		let embed_gift = general_ES.gift(interaction.member, recipient, cards);

		// prettier-ignore
		await Promise.all([
			// Remove the cards from the user's card_inventory
			userManager.inventory.remove(interaction.user.id, cards.map(c => c?.uid)),
			// Add the cards to the recipient card_inventory
			userManager.inventory.add(recipient.id, cards),
			// Update the recipient's quest progress
			// userManager.quests.increment.cardsNew(recipient.id, cards.length),
			// Send a DM to the recipient
			messenger.gift.cards(interaction.user, recipient, cards)
		])
			// Trigger the recipient quest progress update
			.then(async () => questManager.updateQuestProgress(recipient));

		// Send the embed :: { GIFT }
		return await embed_gift.send({ interaction });
	}
};
