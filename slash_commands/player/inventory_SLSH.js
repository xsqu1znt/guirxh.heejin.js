const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../../modules/discordTools");
const { error_ES, user_ES } = require("../../modules/embedStyles/index");
const { userManager } = require("../../modules/mongo/index");
const userParser = require("../../modules/userParser");
const jt = require("../../modules/jsTools");

module.exports = {
	// prettier-ignore
	options: { icon: "📖", deferReply: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("inventory")
		.setDescription("View your card inventory")

		.addUserOption(option => option.setName("player").setDescription("View another player's inventory"))

		.addStringOption(option => option.setName("rarity").setDescription("Filter by RARITY"))
		.addStringOption(option => option.setName("setid").setDescription("Filter by SETID"))
		.addStringOption(option => option.setName("dupes").setDescription("Filter by DUPES | use \"all\" to filter by all"))
		.addStringOption(option => option.setName("category").setDescription("Filter by CATEGORY"))
		.addStringOption(option => option.setName("group").setDescription("Filter by GROUP"))
		.addStringOption(option => option.setName("single").setDescription("Filter by SINGLE"))
		.addStringOption(option => option.setName("name").setDescription("Filter by NAME"))

		.addStringOption(option => option.setName("sorting").setDescription("Default: SETID")
			.addChoices(
				{ name: "🗣️ Set ID", value: "set" },
				{ name: "🃏 Global ID", value: "global" },
				{ name: "📅 Recent", value: "recent" }
			)
        )

		.addStringOption(option => option.setName("order").setDescription("Default: Ascending")
			.addChoices({ name: "⬆️ Ascending", value: "ascending" }, { name: "⬇️ Descending", value: "descending" })
		),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		// Sorting options
		let options_inventory = {
			target: interaction.options.getUser("player") || interaction.member,
			rarity: interaction.options.getString("rarity") || "",
			setID: interaction.options.getString("setid") || "",
			globalID: interaction.options.getString("dupes") || "",
			category: interaction.options.getString("category") || "",
			group: interaction.options.getString("group") || "",
			single: interaction.options.getString("single") || "",
			name: interaction.options.getString("name") || "",
			sorting: interaction.options.getString("sorting") || "setID",
			order: interaction.options.getString("order") || "ascending"
		};

		// prettier-ignore
		// Temporary workaround to prevent over-stressing the bot
		if (client.cooldowns_inventory.get(interaction.user.id)) return await error_ES.send({
			interaction, description: "Please wait until your other inventory loads before using it again"
		});

		// Set temporary cooldown
		client.cooldowns_inventory.set(interaction.user.id, Date.now());

		let username = options_inventory.target?.user?.username || options_inventory.target?.username; // DEBUG

		let timestamp_start_userData = Date.now(); // DEBUG
		// prettier-ignore
		console.log(`fetching inventory for ${username}...`); // DEBUG

		// Fetch the targetUser from Mongo
		let userData = await userManager.fetch(options_inventory.target.id, { type: "full" });
		if (!userData) return await error_ES.send({ interaction, description: "That user has not started yet" });

		// prettier-ignore
		console.log(`DONE fetched inventory for ${username} • time: ${jt.eta(Date.now(), { since: timestamp_start_userData })}`); // DEBUG

		// Parse the user's card_inventory
		userData = userParser.cards.parseInventory(userData, { unique: false });

		let timestamp_start_stats = Date.now(); // DEBUG
		console.log(`fetching stats for ${username}...`); // DEBUG

		let inventory_stats = await userManager.inventory.stats(options_inventory.target.id);

		// prettier-ignore
		console.log(`DONE fetched stats for ${username} • time: ${jt.eta(Date.now(), { since: timestamp_start_stats })}`); // DEBUG

		let timestamp_start_embed = Date.now(); // DEBUG
		console.log(`generating inventory embeds for ${username}...`); // DEBUG

		// Create the embeds :: { USER INVENTORY }
		let embeds_inventory = user_ES.inventory(userData, options_inventory, inventory_stats.categories);

		// prettier-ignore
		console.log(`DONE generate inventory embeds '${username}' • time: ${jt.eta(Date.now(), { since: timestamp_start_embed })}`); // DEBUG

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_inventory],
			pagination: { type: "longJump", useReactions: true }
        });

		let timestamp_start_send = Date.now(); // DEBUG
		console.log(`sending inventory for ${username}...`); // DEBUG

		let msg = await embedNav.send();

		// prettier-ignore
		console.log(`DONE inventory sent for '${username}' • time: ${jt.eta(Date.now(), { since: timestamp_start_send })}`); // DEBUG

		// Delete the cooldown
		client.cooldowns_inventory.delete(interaction.user.id);

		return msg;
	}
};
