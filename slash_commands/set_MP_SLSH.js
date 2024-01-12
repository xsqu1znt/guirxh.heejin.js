const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../modules/discordTools");
const { error_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const jt = require("../modules/jsTools");

const config = {
	bot: require("../configs/config_bot.json"),
	player: require("../configs/config_player.json")
};

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
		author: { text: "$USERNAME | set | ⭐ favorite", iconURL: true },
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
		author: { text: "$USERNAME | set | ⭐ favorite", iconURL: true },
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
		author: { text: "$USERNAME | set | 🏃 idol", iconURL: true },
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
		author: { text: "$USERNAME | set | 🏃 idol", iconURL: true },
		description: `Your \`🏃 idol\` has been unset`
	});

	// Send the embed
	return await embed_idol.send();
}

/** @param {CommandInteraction} interaction @param {string} uid */
async function subcommand_vault_add(interaction, uids) {
	// Fetch the cards from the user's inventory
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that are already locked
	cards = cards.filter(c => !c.locked);

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
		interaction, description: `${uids.length === 1 ? "That card is" : "Those cards are"} already in your \`🔒 vault\``
	});

	// Lock the cards
	await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, { ...c, locked: true })));

	// Get the number of cards that were already locked
	let cardsAlreadyInVault = uids.length - cards.length;

	// Format cards into readable strings
	let cards_f = cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE ? [] : cards.map(c => cardManager.toString.basic(c));

	// Create the embed :: { VAULT ADD }
	let embed_vault = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | edit | 🔒 vault", iconURL: true },
		description:
			cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE
				? `${cards.length} ${cards.length === 1 ? "card" : "cards"} added to your \`🔒 vault\``
				: `${cards.length} ${cards.length === 1 ? "card" : "cards"} added to your \`🔒 vault\`:\n>>> ${cards_f.join(
						"\n"
				  )}`,
		// prettier-ignore
		footer: cardsAlreadyInVault ? `${cardsAlreadyInVault} ${cardsAlreadyInVault === 1 ? "card was" : "cards were"} already in your 🔒 vault` : ""
	});

	// Send the embed
	return await embed_vault.send();
}
/** @param {CommandInteraction} interaction @param {string} uid */
async function subcommand_vault_remove(interaction, uids) {
	// Fetch the cards from the user's inventory
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that aren't locked
	cards = cards.filter(c => c.locked);

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
		interaction, description: `${uids.length === 1 ? "That card is" : "Those cards are"} not in your \`🔒 vault\``
	});

	// Unlock the cards
	await Promise.all(cards.map(c => userManager.inventory.update(interaction.user.id, { ...c, locked: false })));

	// Get the number of cards that were already unlocked
	let cardsNotInVault = uids.length - cards.length;

	// Format cards into readable strings
	let cards_f = cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE ? [] : cards.map(c => cardManager.toString.basic(c));

	// prettier-ignore
	// Create the embed :: { VAULT REMOVE }
	let embed_vault = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | edit | 🔒 vault", iconURL: true },
		description: cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE
			? `${cards.length} ${cards.length === 1 ? "card" : "cards"} removed from your \`🔒 vault\``
			: `${cards.length} ${cards.length === 1 ? "card" : "cards"} removed from your \`🔒 vault\`:\n>>> ${cards_f.join("\n")}`,
		footer: cardsNotInVault ? `${cardsNotInVault} ${cardsNotInVault === 1 ? "card was" : "cards were"} not in your 🔒 vault` : ""
	});

	// Send the embed
	return await embed_vault.send();
}

/** @param {CommandInteraction} interaction @param {string} uid */
async function subcommand_team_add(interaction, uids) {
	// Clean out non-existing team members and return the current team
	let team = await userManager.inventory.clearNullTeamMembers(interaction.user.id);

	// prettier-ignore
	// Check if the user's exceeding the max team size
	if (uids.length > config.player.team.MAX_SIZE - team.length) return await error_ES.send({
		interaction,
		description: `Your \`👯 team\` can only have up to \`${config.player.team.MAX_SIZE}\` cards`,
		footer: config.player.team.MAX_SIZE - team.length ? `slots remaining: ${config.player.team.MAX_SIZE - team.length}` : ""
	});

	// Fetch the cards so we have the cards' information
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that are already on the user's team
	cards = cards.filter(c => !team.includes(c.uid));

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
		interaction, description: `${uids.length === 1 ? "That card is" : "Those cards are"} already on your \`👯 team\``
	});

	await Promise.all([
		// Add the cards to the user's team
		userManager.update(interaction.user.id, { card_team_uids: [...team, ...cards.map(c => c.uid)] }),
		// Update the user's quest stats
		userManager.quests.update.teamPower(interaction.user.id)
	]);

	// Get the number of cards that were already on the user's team
	let cardsAlreadyOnTeam = uids.length - cards.length;

	// Format cards into readable strings
	let cards_f = cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE ? [] : cards.map(c => cardManager.toString.basic(c));

	// prettier-ignore
	// Create the embed :: { VAULT ADD }
	let embed_team = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | edit | 👯 team", iconURL: true },
		description: cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE
			? `${cards.length} ${cards.length === 1 ? "card" : "cards"} added to your \`👯 team\``
			: `${cards.length} ${cards.length === 1 ? "card" : "cards"} added to your \`👯 team\`:\n>>> ${cards_f.join("\n")}`,
		footer: cardsAlreadyOnTeam ? `${cardsAlreadyOnTeam} ${cardsAlreadyOnTeam === 1 ? "card was" : "cards were"} already on your 👯 team` : ""
	});

	// Send the embed
	return await embed_team.send();
}
/** @param {CommandInteraction} interaction @param {string} uid */
async function subcommand_team_remove(interaction, uids) {
	// Clean out non-existing team members and return the current team
	let team = await userManager.inventory.clearNullTeamMembers(interaction.user.id);

	// Fetch the cards so we have the cards' information
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids });

	// Filter out cards that are already on the user's team
	cards = cards.filter(c => team.includes(c.uid));

	// prettier-ignore
	if (!cards.length) return await error_ES.send({
		interaction, description: `${uids.length === 1 ? "That card is" : "Those cards are"} not on your \`👯 team\``
	});

	await Promise.all([
		// Remove the cards from the user's team
		userManager.update(interaction.user.id, {
			card_team_uids: team.filter(uid => !cards.map(c => c.uid).includes(uid))
		}),
		// Update the user's quest stats
		userManager.quests.update.teamPower(interaction.user.id)
	]);

	// Get the number of cards that were already on the user's team
	let cardsNotOnTeam = uids.length - cards.length;

	// Format cards into readable strings
	let cards_f = cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE ? [] : cards.map(c => cardManager.toString.basic(c));

	// prettier-ignore
	// Create the embed :: { VAULT ADD }
	let embed_team = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | edit :: 👯 team", iconURL: true },
		description: cards.length > config.bot.MAX_CARDS_BEFORE_TRUNCATE
			? `${cards.length} ${cards.length === 1 ? "card" : "cards"} removed from your \`👯 team\``
			: `${cards.length} ${cards.length === 1 ? "card" : "cards"} removed from your \`👯 team\`:\n>>> ${cards_f.join("\n")}`,
		footer: cardsNotOnTeam ? `${cardsNotOnTeam} ${cardsNotOnTeam === 1 ? "card was" : "cards were"} not on your 👯 team` : ""
	});

	// Send the embed
	return await embed_team.send();
}

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
		// prettier-ignore
		let uids = jt.unique(uid.toUpperCase().split(",").map(u => u.trim())) || [];

		// Determine the operation
		let operation = add ? "add" : "remove";

		// Defer the interaction
		await interaction.deferReply().catch(() => null);

		/* - - - - - { Validate UIDs } - - - - - */
		// Check if the chosen UID(s) exist in the user's card_inventory
		let hasUIDs = jt.isArray(await userManager.inventory.has(interaction.user.id, { uids }));

		// Filter out invalid UIDs
		let uids_filtered = uids.filter((u, idx) => hasUIDs[idx]);

		// prettier-ignore
		if (!uids_filtered.length) return await error_ES.send({
            interaction,
            description: `${uids.length === 1 ? `\`${uids[0]}\` is` : "Those are"} not ${uids.length === 1 ? "a valid card UID" : "valid card UIDs"}`
		});

		// Fetch the user from Mongo
		let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

		// Execute the operation
		switch (interaction.options.getString("edit")) {
			// prettier-ignore
			case "favorite": switch (operation) {
                case "add": return await subcommand_favorite_add(interaction, userData, uids_filtered[0]);
                case "remove": return await subcommand_favorite_remove(interaction, userData, uids_filtered[0]);
            }

			// prettier-ignore
			case "idol": switch (operation) {
                case "add": return await subcommand_idol_add(interaction, userData, uids_filtered[0]);
                case "remove": return await subcommand_idol_remove(interaction, userData, uids_filtered[0]);
            }

			// prettier-ignore
			case "vault": switch (operation) {
                case "add": return await subcommand_vault_add(interaction, uids_filtered);
                case "remove": return await subcommand_vault_remove(interaction, uids_filtered);
            }

			// prettier-ignore
			case "team": switch (operation) {
                case "add": return await subcommand_team_add(interaction, uids_filtered);
                case "remove": return await subcommand_team_remove(interaction, uids_filtered);
            }
		}
	}
};
