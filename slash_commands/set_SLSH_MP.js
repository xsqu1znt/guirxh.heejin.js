const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools/_dsT");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const userParser = require("../modules/userParser");
const cardManager = require("../modules/cardManager");
const _jsT = require("../modules/jsTools/_jsT");

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
        
        // TODO: make add/remove booleans for easy switch case use

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
			case "favorite": // TODO: use a switch case to determine whether add/remove was used
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
		}
	}
};
