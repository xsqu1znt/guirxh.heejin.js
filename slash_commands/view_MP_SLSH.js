const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../modules/discordTools");
const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const cardManager = require("../modules/cardManager");
const jt = require("../modules/jsTools");

/** @param {CommandInteraction} interaction @param {string} uid */
async function subcommand_uniqueID(interaction, uid) {
	// Fetch the card, if it exists
	let card = await userManager.inventory.get(interaction.user.id, { uid });
	// prettier-ignore
	if (!card) return await error_ES.send({ interaction, description: `\`${uid}\` is not a valid card UID` });

	// Fetch the user from Mongo
	let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

	// Create the embed :: { VIEW UID }
	let embed_view = general_ES.view(interaction.member, userData, card, "uid");

	// Send the embed
	return await embed_view.send();
}

/** @param {CommandInteraction} interaction @param {string} globalID */
async function subcommand_globalID(interaction, globalID) {
	// Fetch the card, if it exists
	let card = cardManager.get.globalID(globalID);
	// prettier-ignore
	if (!card) return await error_ES.send({ interaction, description: `\`${uid}\` is not a valid card GID` });

	// Create the embed :: { VIEW GLOBAL ID }
	let embed_view = general_ES.view(interaction.member, null, card, "gid");

	// Send the embed
	return await embed_view.send();
}

/** @param {CommandInteraction} interaction @param {string} setID */
async function subcommand_setIDs(interaction, setID) {
	// Fetch the card, if it exists
	let cards = cardManager.get.setID(setID);
	// prettier-ignore
	if (!cards.length) return await error_ES.send({ interaction, description: `\`${uid}\` is not a valid card set ID` });

	// Create the embed :: { VIEW SET ID }
	let embeds_view = general_ES.view(interaction.member, null, cards, "set");

	// prettier-ignore
	// Setup page navigation
	let embedNav = new EmbedNavigator({
		interaction, embeds: [embeds_view],
		pagination: { type: "shortJump", useReactions: true }
	});

	// Send the embed with navigation
	return await embedNav.send();
}

/** @param {CommandInteraction} interaction */
async function subcommand_section_favorite(interaction) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

	// Fetch the card, if it exists
	let card = await userManager.inventory.get(interaction.user.id, { uid: userData.card_favorite_uid });
	// prettier-ignore
	if (!card) return await error_ES.send({
        interaction,
        description: `You do not have a \`⭐ favorite\` card!\n> *Use \`/set\` \`edit:⭐ favorite\` to set one*`
    });

	// Create the embed :: { VIEW FAVORITE }
	let embed_view = general_ES.view(interaction.member, userData, card, "favorite");

	// Send the embed
	return await embed_view.send();
}

/** @param {CommandInteraction} interaction */
async function subcommand_section_idol(interaction) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

	// Fetch the card, if it exists
	let card = await userManager.inventory.get(interaction.user.id, { uid: userData.card_selected_uid });
	// prettier-ignore
	if (!card) return await error_ES.send({
        interaction,
        description: `You do not have a \`🏃 idol\` card!\n> *Use \`/set\` \`edit:🏃 idol\` to set one*`
    });

	// Create the embed :: { VIEW IDOL }
	let embed_view = general_ES.view(interaction.member, userData, card, "idol");

	// Send the embed
	return await embed_view.send();
}

/** @param {CommandInteraction} interaction */
async function subcommand_section_vault(interaction) {
	// Fetch the user from Mongo
	let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

	// Fetch the card, if it exists
	let cards = await userManager.inventory.getVault(interaction.user.id);
	// prettier-ignore
	if (!cards.length) return await error_ES.send({
        interaction,
        description: `You do not have any cards in your \`🔒 vault\`!\n> *Use \`/set\` \`edit:🔒 vault\` to add some*`
    });

	// Create the embed :: { VIEW IDOL }
	let embed_view = general_ES.view(interaction.member, userData, cards, "vault");

	// prettier-ignore
	// Setup page navigation
	let embedNav = new EmbedNavigator({
		interaction, embeds: [embed_view],
		pagination: { type: "longJump", useReactions: true }
	});

	// Send the embed with navigation
	return await embedNav.send();
}

/** @param {CommandInteraction} interaction */
async function subcommand_section_team(interaction) {
	let teamUIDs = await userManager.inventory.clearNullTeamMembers(interaction.user.id);
	// prettier-ignore
	if (!teamUIDs.length) return await error_ES.send({
        interaction,
        description: `You do not have any cards on your \`👯 team\`!\n> *Use \`/set\` \`edit:👯 team\` to add some*`
    });

	// Fetch the user from Mongo
	let userData = await userManager.fetch(interaction.user.id, { type: "essential" });

	// Fetch the card, if it exists
	let cards = await userManager.inventory.getMultiple(interaction.user.id, { uids: teamUIDs });

	// Create the embed :: { VIEW IDOL }
	let embed_view = general_ES.view(interaction.member, userData, cards, "team");

	// prettier-ignore
	// Setup page navigation
	let embedNav = new EmbedNavigator({
		interaction, embeds: [embed_view],
		pagination: { type: "short", dynamic: false, useReactions: true }
	});

	// Send the embed with navigation
	return await embedNav.send();
}

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
				{ name: "⭐ favorite", value: "favorite" },
				{ name: "🏃 idol", value: "idol" },
				{ name: "🔒 vault", value: "vault" },
				{ name: "👯 team", value: "team" }
			)
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Get interaction options
		let uid = interaction.options.getString("uid") || null;
		let globalID = interaction.options.getString("gid") || null;
		let setID = interaction.options.getString("setid") || null;
		let section = interaction.options.getString("section") || null;

		// prettier-ignore
		if (!uid && !globalID && !setID && !section) return await error_ES({
            interaction, description: "You must provide either a \`UID\`, \`GID\`, \`set ID\`, or \`section\`",
            ephemeral: true
        });

		// Defer the reply
		await interaction.deferReply().catch(() => null);

		/* - - - - - { Determine the Operation } - - - - - */
		if (uid) return await subcommand_uniqueID(interaction, uid.trim());
		if (globalID) return await subcommand_globalID(interaction, globalID.trim());
		// prettier-ignore
		if (setID) return await subcommand_setIDs(interaction, setID.trim());

		// prettier-ignore
		switch (section) {
			case "favorite": return await subcommand_section_favorite(interaction);
            
            case "idol": return await subcommand_section_idol(interaction);
            
            case "vault": return await subcommand_section_vault(interaction);
            
            case "team": return await subcommand_section_team(interaction);
		}
	}
};
