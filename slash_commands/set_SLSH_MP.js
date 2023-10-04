const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const userParser = require("../modules/userParser");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");

const config = { player: require("../configs/config_player.json") };

module.exports = {
	options: { icon: "🏃", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("set")
        .setDescription("Add/remove a card from something")

        .addStringOption(option => option.setName("edit").setDescription("Choose what you want to set")
            .setRequired(true)
            .addChoices(
                { name: "⭐ favorite", value: "favorite" },
                { name: "🏃 idol", value: "idol" },
                { name: "🔒 vault", value: "vault" },
                { name: "👯 team", value: "team" }
            )
        )

        .addStringOption(option => option.setName("add").setDescription("Add a card using UID"))
        .addStringOption(option => option.setName("remove").setDescription("Remove a card using UID")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Interaction options
		let _add = interaction.options.getString("add");
		let _remove = interaction.options.getString("remove");
		let uids = (_add || _remove || "").toLowerCase().replace(/ /g, "").split(",");

		// Determine the operation
		let operation = "";
		if (_add) operation = "add";
		else if (_remove) operation = "remove";

		// prettier-ignore
		let cards, cards_f;
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		// Create the embed :: { SET }
		let embed_set = new BetterEmbed({ interaction, author: { text: "$USERNAME | set", iconURL: true } });

		// prettier-ignore
		// Check if the user provided any card UIDs
		if (!uids) return await error_ES.send({
            interaction, description: "You need to give a valid card UID", ephemeral: true
        });

		// Defer the interaction
		await interaction.deferReply();

		// Determine the operation type
		switch (interaction.options.getString("edit")) {
			// prettier-ignore
			case "favorite": switch (operation) {
				case "add":
					uids.length = 1;

					// prettier-ignore
					// Check if the card's already favorited
					if (uids[0] === userData.card_favorite_uid) return await error_ES.send({
                	    interaction, description: `\`${uids}\` is already your \`⭐ favorite\``
                	});

					// Fetch the card from the user's card_inventory
					cards = await userManager.inventory.get(interaction.user.id, { uids });

					// prettier-ignore
					// Check if the card exists
					if (!cards) return await error_ES.send({
                	    interaction, description: `\`${uids}\` is not a valid UID`
                	});

					// Set the user's card_favorite_uid in Mongo
					await userManager.update(interaction.user.id, { card_favorite_uid: cards.uid });

					/// Let the user know the result
					cards_f = cardManager.toString.basic(cards);
					return await embed_set.send({ description: `Your \`⭐ favorite\` has been set to:\n> ${cards_f}` });
					
				case "remove":
					await userManager.update(interaction.user.id, { card_favorite_uid: "" });
					// Let the user know the result
                    return await embed_set.send({ description: "You successfully removed your \`⭐ favorite\`" });
			}

			// prettier-ignore
			case "idol": switch (operation) {
				case "add":
					uids.length = 1;

					// prettier-ignore
					// Check if the card's already favorited
					if (uids[0] === userData.card_selected_uid) return await error_ES.send({
                	    interaction, description: `\`${uids}\` is already your \`🏃 idol\``
                	});

					// Fetch the card from the user's card_inventory
					cards = await userManager.inventory.get(interaction.user.id, { uids });

					// prettier-ignore
					// Check if the card exists
					if (!cards) return await error_ES.send({
                	    interaction, description: `\`${uids}\` is not a valid UID`
                	});

					// Set the user's card_selected_uid in Mongo
					await userManager.update(interaction.user.id, { card_selected_uid: cards.uid });

					/// Let the user know the result
					cards_f = cardManager.toString.basic(cards);
					return await embed_set.send({ description: `Your \`🏃 idol\` has been set to:\n> ${cards_f}` });
					
				case "remove":
					await userManager.update(interaction.user.id, { card_selected_uid: "" });
					// Let the user know the result
                    return await embed_set.send({ description: "You successfully removed your \`🏃 idol\`" });
			}

			// prettier-ignore
			case "vault": switch (operation) {
				case "add":
					// Fetch the cards from the user's card_inventory
					cards = await userManager.inventory.get(interaction.user.id, { uids });

					// Filter out UIDs that weren't found (used for extra info at the end)
					uids = cards.map(c => c.uid);

					// prettier-ignore
					// Check if the cards exists
					if (!cards.length) return await error_ES.send({
                	    interaction, description: `\`${uids.join(", ")}\` ${uids.length === 1 ? "is not a valid UID" : "are not valid UIDs"}`
					});
					
					/// Check if the cards are already locked
					cards = cards.filter(c => !c.locked);
					// prettier-ignore
					if (!cards.length) return await error_ES.send({
                	    interaction, description: `${cards.length === 1 ? `\`${uids}\` is` : "Those cards are"} already in your \`🔒 vault\``
					});

					/// Update the user's cards in Mongo
					cards.forEach(c => c.locked = true);
					await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, c)));

					/// Let the user know the result
					let extraInfo_add = cards.length < uids.length ? `\`${cards.length}\` ${cards.length === 1 ? "card was" : "cards were"} already in your \`🔒 vault\`` : ""
					return await embed_set.send({ description: `\`${cards.length}\` ${cards.length === 1 ? "card" : "cards"} added to your \`🔒 vault\`\n${extraInfo_add}` });

				case "remove":
					// Fetch the cards from the user's card_inventory
					cards = await userManager.inventory.get(interaction.user.id, { uids });

					// Filter out UIDs that weren't found (used for extra info at the end)
					uids = cards.map(c => c.uid);

					// prettier-ignore
					// Check if the cards exists
					if (!cards.length) return await error_ES.send({
                	    interaction, description: `\`${uids.join(", ")}\` ${uids.length === 1 ? "is not a valid UID" : "are not valid UIDs"}`
					});
					
					/// Check if the cards are already unlocked
					cards = cards.filter(c => c.locked);
					// prettier-ignore
					if (!cards.length) return await error_ES.send({
                	    interaction, description: `${cards.length === 1 ? `\`${uids}\` is` : "Those cards are"} not in your \`🔒 vault\``
					});

					/// Update the user's cards in Mongo
					cards.forEach(c => c.locked = false);
					await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, c)));

					/// Let the user know the result
					let extraInfo_remove = cards.length < uids.length ? `\`${cards.length}\` ${cards.length === 1 ? "card was" : "cards were"} not in your \`🔒 vault\`` : ""
					return await embed_set.send({ description: `\`${cards.length}\` ${cards.length === 1 ? "card" : "cards"} removed from your \`🔒 vault\`\n${extraInfo_remove}` });
			}

			// prettier-ignore
			case "team": switch (operation) {
				case "add":
					uids.length = config.player.team.MAX_SIZE;

					// Fetch the user's team cards from their card_inventory
					let card_team_add = await userManager.inventory.get(interaction.user.id, {
						uids: userData.card_team_uids, filter: true
					});

					// prettier-ignore
					// Check if the user's team is full
					if (card_team_add.length >= config.player.team.MAX_SIZE) return await error_ES.send({
						interaction, description: `Your \`👯 team\` can only have up to \`${config.player.team.MAX_SIZE}\` cards`
					});

					// Fetch the cards from the user's card_inventory
					cards = await userManager.inventory.get(interaction.user.id, { uids });

					// prettier-ignore
					// Check if the cards exists
					if (!cards.length) return await error_ES.send({
                	    interaction, description: `\`${uids.join(", ")}\` ${uids.length === 1 ? "is not a valid UID" : "are not valid UIDs"}`
					});

					// Add the card to the user's team
					await userManager.update(interaction.user.id, { card_team_uids: [...card_team_add, ...cards].map(c => c.uid) });

					/// Let the user know the result
					cards_f = cards.map(c => cardManager.toString.basic(c));
                    return await embed_set.send({ description: `\`👯 team edit\` You successfully added:\n> ${cards_f}` });
			
				case "remove":
					uids.length = config.player.team.MAX_SIZE;

					// Fetch the user's team cards from their card_inventory
					let card_team_remove = await userManager.inventory.get(interaction.user.id, {
						uids: userData.card_team_uids, filter: true
					});
					
					// Check if the user gave valid UIDs that are in their team
					uids = uids.filter(uid => card_team_remove.map(c => c.uid).includes(uid));

					// prettier-ignore
					if (!uids.length) return await error_ES.send({
                	    interaction, description: `\`${uids.join(", ")}\` ${uids.length === 1 ? "is not" : "are not"} in your \`👯 team\``
					});

					// Send a pull request for the user's card_team_uids
					await userManager.update(interaction.user.id, { $pull: { card_team_uids: { $in: uids } } });

					/// Let the user know the result
					cards_f = cards.map(c => cardManager.toString.basic(c));
                    return await embed_set.send({ description: `\`👯 team edit\` You successfully removed:\n> ${cards_f}` });
			}
		}
	}
};
