const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../modules/discordTools/_dsT");
const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");

module.exports = {
	options: { icon: "👀", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("view")
		.setDescription("View information about a card")

		.addStringOption(option => option.setName("uid").setDescription("UID of a card you own"))
		.addStringOption(option => option.setName("gid").setDescription("GID of any card"))
		.addStringOption(option => option.setName("setid").setDescription("Set ID to view all cards in a set"))

		.addStringOption(option => option.setName("section").setDescription("More sections to view")
			.addChoices(
				{ name: "🏃 idol", value: "idol" },
				{ name: "⭐ favorite", value: "favorite" },
				{ name: "🔒 vault", value: "vault" },
				{ name: "👯 team", value: "team" }
			)
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		/// Interaction options
		let uid = interaction.options.getString("uid");
		let globalID = interaction.options.getString("gid");
		let setID = interaction.options.getString("setid");
		let section = interaction.options.getString("section");

		// prettier-ignore
		// Send the appropriate view based on what option the user provided
		if (uid) {
			await interaction.deferReply();

			// Fetch the card from the user's card_inventory
			let card = await userManager.inventory.get(interaction.user.id, { uids: uid });
			if (!card) return await error_ES.send({ interaction, description: "You need to give a valid UID" });

			// Fetch the user from Mongo
			let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

			// Create the embed :: { VIEW }
			let embed_view = general_ES.view(interaction.member, userData, card, "uid");
			return await embed_view.send({ interaction });
		}

		else if (globalID) {
			// Get the card from our database
			let card = cardManager.get.globalID(globalID);
			if (!card) return await error_ES.send({ interaction, description: "You need to give a valid GID" });

			// Create the embed :: { VIEW }
			let embed_view = general_ES.view(interaction.member, null, card, "gid");
			return await embed_view.send({ interaction });
		}

		else if (setID) {
			// Get the cards from our database
			let cards = cardManager.get.setID(setID);
			if (!cards.length) return await error_ES.send({ interaction, description: "You need to give a valid set ID" });

			// Create the embeds :: { VIEW }
			let embeds_view = general_ES.view(interaction.member, null, cards, "set");

			// prettier-ignore
			// Send the embeds with navigation
			let embedNav = new EmbedNavigator({
				interaction, embeds: [embeds_view],
				pagination: { type: "shortJump", useReactions: true }
			});

			return await embedNav.send();
		}

		else if (section) {
			await interaction.deferReply();

			// Fetch the user from Mongo
			let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

			let card = null;

			switch (section) {
				// Fetch a card from the user's card_inventory :: { IDOL }
				case "idol":
					card = await userManager.inventory.get(interaction.user.id, { uids: userData.card_selected_uid });
					if (!card) return await error_ES.send({ interaction, description: "You do not have an idol set\n> *Use \`/set\` \`edit:🏃 idol\` to set one*" });
					break;

				// Fetch a card from the user's card_inventory :: { FAVORITE }
				case "favorite":
					card = await userManager.inventory.get(interaction.user.id, { uids: userData.card_favorite_uid });
					if (!card) return await error_ES.send({ interaction, description: "You do not have a favorite card\n> *Use \`/set\` \`edit:⭐ favorite\` to set one*" });
					break;

				// Fetch cards from the user's card_inventory :: { VAULT }
				case "vault":
					let cards_vault = await userManager.inventory.vault.get(interaction.user.id);
					// prettier-ignore
					if (!cards_vault || !cards_vault.length) return await error_ES.send({
						interaction, description: "You don't have any cards in your vault\n> *Use \`/set\` \`edit:🔒 vault\` to add cards to your vault*"
					});

					// Create the embeds :: { VIEW }
					let embeds_view_vault = general_ES.view(interaction.member, userData, cards_vault, "vault");

					// prettier-ignore
					// Send the embeds with navigation
					let embedNav_vault = new EmbedNavigator({
						interaction, embeds: [embeds_view_vault],
						pagination: { type: "longJump", useReactions: true }
					});

					return await embedNav_vault.send();

				// Fetch cards from the user's card_inventory :: { TEAM }
				case "team":
					let cards_team = await userManager.inventory.get(interaction.user.id, { uids: userData.card_team_uids });
					// prettier-ignore
					if (!cards_team || !cards_team.length) return await error_ES.send({
						interaction, description: "You do not have a team set\n> *Use \`/set\` \`edit:👯 team\` to set one*"
					});

					// Create the embeds :: { VIEW }
					let embeds_view_team = general_ES.view(interaction.member, userData, cards_team, "team");

					// prettier-ignore
					// Send the embeds with navigation
					let embedNav_team = new EmbedNavigator({
						interaction, embeds: [embeds_view_team],
						pagination: { type: "short", dynamic: false, useReactions: true }
					});

					return await embedNav_team.send();
			}

			if (card) {
				// Create the embed :: { VIEW }
				let embed_view = general_ES.view(interaction.member, userData, card, section);
				return await embed_view.send({ interaction });
			}

			return await error_ES.send({ interaction, description: `\`${section}\` is not a valid option` });
		}
	}
};
