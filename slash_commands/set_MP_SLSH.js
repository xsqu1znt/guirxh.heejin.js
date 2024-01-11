const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const jt = require("../modules/jsTools");

const config = { player: require("../configs/config_player.json") };

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_favorite_add(interaction, userData, uid) {
	// prettier-ignore
	// Check if the card is already the user's favorite
	if (userData.card_favorite_uid === uid) return await error_ES.send({
		interaction, description: `\`${uid}\` is already your \`⭐ favorite\``
	});

	// Set the card as the user's favorite
	await userManager.update(interaction.user.id, { card_favorite_uid: uid });

	// Fetch the card so we have the card's information
	let card = await userManager.inventory.get(interaction.user.id, { uid });

	// Create the embed :: { SET FAVORITE ADD }
	let embed_favorite = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | set", iconURL: true },
		description: `Your \`⭐ favorite\` has been set to:\n> ${cardManager.toString.basic(card)}`,
		imageURL: card.imageURL
	});

	// Send the embed
	return await embed_favorite.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_favorite_remove(interaction, userData, uid) {
	// prettier-ignore
	// Check if the card isn't the user's favorite
	if (userData.card_favorite_uid !== uid) return await error_ES.send({
		interaction, description: `\`${uid}\` is not your \`⭐ favorite\``
	});

	// Unset the user's favorite
	await userManager.update(interaction.user.id, { card_favorite_uid: "" });

	// Create the embed :: { SET FAVORITE REMOVE }
	let embed_favorite = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | set", iconURL: true },
		description: `Your \`⭐ favorite\` has been unset`
	});

	// Send the embed
	return await embed_favorite.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_idol_add(interaction, userData, uid) {
	// prettier-ignore
	// Check if the card is already the user's idol
	if (userData.card_selected_uid === uid) return await error_ES.send({
		interaction, description: `\`${uid}\` is already your \`🏃 idol\``
	});

	// Set the card as the user's idol
	await userManager.update(interaction.user.id, { card_selected_uid: uid });

	// Fetch the card so we have the card's information
	let card = await userManager.inventory.get(interaction.user.id, { uid });

	// Create the embed :: { SET IDOL ADD }
	let embed_idol = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | set", iconURL: true },
		description: `Your \`🏃 idol\` has been set to:\n> ${cardManager.toString.basic(card)}`,
		imageURL: card.imageURL
	});

	// Send the embed
	return await embed_idol.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_idol_remove(interaction, userData, uid) {
	// prettier-ignore
	// Check if the card isn't the user's idol
	if (userData.card_selected_uid !== uid) return await error_ES.send({
		interaction, description: `\`${uid}\` is not your \`🏃 idol\``
	});

	// Unset the user's idol
	await userManager.update(interaction.user.id, { card_selected_uid: "" });

	// Create the embed :: { SET IDOL REMOVE }
	let embed_idol = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | set", iconURL: true },
		description: `Your \`🏃 idol\` has been unset`
	});

	// Send the embed
	return await embed_idol.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_vault_add(interaction, uids) {
	// Fetch the cards from the user's inventory
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that are already locked
	cards = cards.filter(c => c.locked);

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
		interaction, description: `${cards.length === 1 ? "That card was" : "Those cards were"} already in your \`🔒 vault\``
	});

	// Lock the cards
	await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, { ...c, locked: true })));

	// Get the number of cards that were already locked
	let cardsAlreadyInVault = uids.length - cards.length;

	// Create the embed :: { VAULT ADD }
	let embed_vault = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | vault", iconURL: true },
		description: `\`${cards.length}\` cards added to your vault`,
		// prettier-ignore
		footer: cardsAlreadyInVault ? `${cardsAlreadyInVault} ${cardsAlreadyInVault === 1 ? "card was" : "cards were"} already in your vault` : ""
	});

	// Send the embed
	return await embed_vault.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_vault_remove(interaction, uids) {
	// Fetch the cards from the user's inventory
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that aren't locked
	cards = cards.filter(c => !c.locked);

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
			interaction, description: `${cards.length === 1 ? "That card is" : "Those cards are"} not in your \`🔒 vault\``
		});

	// Unlock the cards
	await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, { ...c, locked: false })));

	// Get the number of cards that were already unlocked
	let cardsNotInVault = uids.length - cards.length;

	// Create the embed :: { VAULT REMOVE }
	let embed_vault = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | vault", iconURL: true },
		description: `\`${cards.length}\` cards removed from your vault`,
		// prettier-ignore
		footer: cardsNotInVault ? `${cardsNotInVault} ${cardsNotInVault === 1 ? "card was" : "cards were"} not in your vault` : ""
	});

	// Send the embed
	return await embed_vault.send();
}

/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_team_add(interaction, userData, uids) {}
/** @param {CommandInteraction} interaction @param {UserData} userData @param {string} uid */
async function subcommand_team_remove(interaction, userData, uids) {}

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

        .addStringOption(option => option.setName("add").setDescription("Add a card using its UID separate by comma"))
        .addStringOption(option => option.setName("remove").setDescription("Remove a card using its UID separate by comma")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Get interaction options
		let add = interaction.options.getString("add") || null;
		let remove = interaction.options.getString("remove") || null;

		// prettier-ignore
		if (!add && !remove) return await error_ES.send({
            interaction, description: "You must provide at least 1 UID in either `add` or `remove`",
            ephemeral: true
        });

		/// Put the chosen UID(s) into proper variables
		let uid = add ? add : remove;
		let uids = uid.split(",") || [];

		// Determine the operation
		let operation = add ? "add" : "remove";

		// Defer the interaction
		await interaction.deferReply().catch(() => null);

		/* - - - - - { Validate UIDs } - - - - - */
		// Check if the chosen UID(s) exist in the user's card_inventory
		let hasUIDs = await userManager.inventory.has(interaction.user.id, { uids });

		// Filter out invalid UIDs
		uids = uids.filter((u, idx) => hasUIDs[idx]);

		// prettier-ignore
		if (!uids.length) return await error_ES({
            interaction,
            description: `${uids.length > 1 ? "Those are" : `\`${uids[0]}\` is`} not ${uids.length > 1 ? "valid card UIDs" : "a valid card UID"}`
		});

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		// Execute the operation
		switch (interaction.options.getString("edit")) {
			// prettier-ignore
			case "favorite": switch (operation) {
                case "add": return await subcommand_favorite_add(interaction, userData, uids[0]);
                case "remove": return await subcommand_favorite_remove(interaction, userData, uids[0]);
            }

			// prettier-ignore
			case "idol": switch (operation) {
                case "add": return await subcommand_idol_add(interaction, userData, uids[0]);
                case "remove": return await subcommand_idol_remove(interaction, userData, uids[0]);
            }

			// prettier-ignore
			case "vault": switch (operation) {
                case "add": return await subcommand_vault_add(interaction, uids);
                case "remove": return await subcommand_vault_remove(interaction, uids);
            }

			// prettier-ignore
			case "team": switch (operation) {
                case "add": return await subcommand_team_add(interaction, userData, uids);
                case "remove": return await subcommand_team_remove(interaction, userData, uids);
            }
		}
	}
};
