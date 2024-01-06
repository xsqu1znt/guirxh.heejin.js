const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { EmbedNavigator } = require("../modules/discordTools");
const { error_ES, user_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const userParser = require("../modules/userParser");

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

		// Fetch the targetUser from Mongo
		let userData = await userManager.fetch(options_inventory.target.id, { type: "full" });
		if (!userData) return await error_ES.send({ interaction, description: "That user has not started yet" });

		// Parse the user's card_inventory
		userData = userParser.cards.parseInventory(userData, { unique: false });

		let inventory_stats = await userManager.inventory.stats(interaction.user.id);
		// Create the embeds :: { USER INVENTORY }
		let embeds_inventory = user_ES.inventory(userData, options_inventory, inventory_stats.categories);

		// prettier-ignore
		// Set up page navigation
		let embedNav = new EmbedNavigator({
			interaction, embeds: [embeds_inventory],
			pagination: { type: "longJump", useReactions: true }
        });

		return await embedNav.send();
	}
};
