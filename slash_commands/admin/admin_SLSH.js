const {
	Client,
	CommandInteraction,
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType
} = require("discord.js");

const { BetterEmbed, EmbedNavigator } = require("../../modules/discordTools");
const { error_ES } = require("../../modules/embedStyles/index");
const { userManager } = require("../../modules/mongo/index");
const cardManager = require("../../modules/cardManager");
const messenger = require("../../modules/messenger");
const jt = require("../../modules/jsTools");

const config = { bot: require("../../configs/config_bot.json") };

/** @param {Client} client @param {CommandInteraction} interaction */
async function subcommand_test(client, interaction) {
	// Defer the interaction
	await interaction.deferReply().catch(() => null);

	throw new Error("hah, gotcha!");
}

/** @param {Client} client @param {CommandInteraction} interaction */
async function subcommand_server(client, interaction) {
	// Interaction options
	let serverID = interaction.options.getString("server") || null;

	let embed_error = new BetterEmbed({
		interaction,
		author: { text: "$USERNAME | servers", iconURL: true },
		description: "Could not fetch guilds"
	});

	// Fetch all the guilds the client's currently in
	let guilds_partial = await client.guilds.fetch();

	//* Try to leave the server if an ID is given
	if (serverID)
		try {
			// Fetch the server based on the given ID
			let guildToLeave = await guilds_partial.find(guild => guild.id === serverID).fetch();

			// Leave the server
			await guildToLeave.leave();

			// Log the leave
			logger.success(`successfully left server (${serverID})`);

			// Let the user know the result
			return await embed_error.send({ description: `Successfully left server: ${inline(true, "🆔", serverID)}` });
		} catch (err) {
			// Log the error
			logger.error("Could not leave server", `server id: ${serverID}`, err);

			// Let the user know that the server couldn't be left
			return await embed_error.send({ description: `Failed to leave server: ${inline(true, "🆔", serverID)}` });
		}

	//* Show the servers the client's currently in
	// Fetch each guild to get the full guild object
	let guilds_full = await Promise.all(guilds_partial.map(guild => guild.fetch()));

	// Sort by join date
	guilds_full = guilds_full.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

	// Parse each guild into a human readable string
	let guilds_full_f = await Promise.all(
		guilds_full.map(async (guild, idx) => {
			let invite_url = "";

			/* try {
				// Fetch the inviteManager from the guild
				// only works if the client has the Manage Server permission in that guild
				let inviteManager = await guild.invites.fetch();

				// Get the first active invite in the guild
				let invite = inviteManager.at(0);

				// Create a new temp invite if an invite doesn't already exist | expires in 5 minutes
				invite ||= await guild.invites.create(guild.systemChannelId, {
					maxAge: 60 * 5,
					maxUses: 1
				});

				// Get the invite url
				if (invite) invite_url = invite.url;
			} catch (err) {
				// Log the error
				// logger.error("Could not create server invite", `server id: ${serverID}`, err);
			} */

			// Return a formatted guild string
			return "$IDX $GUILD_NAME ・ $GUILD_ID\n> $MEMBER_COUNT : `📆` $JOINED"
				.replace("$IDX", inline(`${idx + 1}.`))
				.replace("$GUILD_NAME", bold(invite_url ? link(guild.name, invite_url) : guild.name))
				.replace("$GUILD_ID", inline("🆔", guild.id))
				.replace("$MEMBER_COUNT", inline("👥", guild.memberCount))
				.replace("$JOINED", `<t:${numberTools.milliToSeconds(guild.members.me.joinedTimestamp)}>`);
		})
	);

	// Break up the formatted servers to only show 10 per page
	guilds_full_f = arrayTools.chunk(guilds_full_f, 10);

	// Create a page for each chunk
	let embeds_servers = [];
	for (let chunk of guilds_full_f) {
		let _embed = new BetterEmbed({
			author: { text: "$USERNAME | servers", iconURL: true },
			description: chunk.join("\n")
		});

		embeds_servers.push(_embed);
	}

	// Send the embed with navigation
	let embedNav = new EmbedNavigator({ interaction, embeds: [embeds_servers], pagination: { type: "shortJump" } });
	return await embedNav.send();
}

/** @param {Client} client @param {CommandInteraction} interaction */
async function subcommand_summon(client, interaction) {
	// Get interaction options
	let user = interaction.options.getUser("user") || null;
	let globalIDs = interaction.options.getString("gid")?.replace(/ /g, "").split(",");
	globalIDs = jt.isArray(globalIDs);

	// prettier-ignore
	// Create a base embed
	let embed_summon = new BetterEmbed({
		interaction, author: { text: "$USERNAME | summon", iconURL: true }
	});

	// Fallback
	if (!user) return await embed_summon.send({ description: "You need to give a user ID" });

	// Check if the user exists in the database
	if (!(await userManager.exists(user.id)))
		return await embed_summon.send({
			description: "That user has not started yet"
		});

	// Fetch the cards from our collection
	let cards = globalIDs.map(globalID => cardManager.get.globalID(globalID)).filter(card => card);
	// prettier-ignore
	if (!cards.length) return await embed_summon.send({
		description: "You need to give a valid card ID"
	});

	await Promise.all([
		// Add the cards to the user's card_inventory
		userManager.inventory.add(user.id, cards),
		// Update the user's quests stats
		userManager.quests.increment.cardsNew(user.id, cards.length)
	]);

	/// Create and send the embeds
	let recipient = await client.users.fetch(user.id);

	let card_last = cards.slice(-1)[0] || cards[0];
	let cards_f = cards.map(card => cardManager.toString.basic(card));

	return await Promise.all([
		// Let the user know the result
		embed_summon.send({
			description: `You summoned ${cards.length === 1 ? "`1 card`" : `\`${cards.length} cards\``} for **${
				recipient.username
			}**\n>>> ${cards_f.join("\n")}`,
			imageURL: card_last.imageURL
		}),
		// Send a DM to the recipient
		messenger.gift.cards(recipient, interaction.user, cards)
	]);
}

/** @param {CommandInteraction} interaction @param {"balance"|"ribbon"} currencyType */
async function subcommand_payUser(interaction, currencyType) {
	// Get interaction options
	let user = interaction.options.getUser("user");
	let amount = interaction.options.getNumber("amount");

	// Fallback
	if (!user) return await embed_summon.send({ description: "You need to give a user ID" });

	// prettier-ignore
	if (amount === 0 || typeof amount !== "number") return await error_ES.send({
        interaction, description: "You did not give an amount"
    });

	await Promise.all([
		// Increment the user's balance
		userManager.balance.increment(user.id, amount, currencyType),
		// Update the user's quest stats
		userManager.quests.increment.balance(user.id, amount, currencyType)
	]);

	/* - - - - - { Send Details } - - - - - */
	let userData = await userManager.fetch(user.id, { type: "balance" });
	let currencyEmoji = "";
	let balance = 0;

	// prettier-ignore
	switch (currencyType) {
        case "balance": currencyEmoji = config.bot.emojis.currency_1.EMOJI; balance = userData.balance; break;
        case "ribbon": currencyEmoji = config.bot.emojis.currency_2.EMOJI; balance = userData.ribbons; break;
    }

	// Let the user know they were given currency
	if (amount > 0) messenger.gift.currency(user, interaction.user, amount, balance, currencyType);

	// prettier-ignore
	// Create the embed :: { ADMIN - PAY }
	let embed_pay = new BetterEmbed({
        interaction, author: { text: "$USERNAME | admin", iconURL: true },
        description: `\`${currencyEmoji} ${amount}\` ${amount > 0 ? "given to" : "withdrawn from"} **${user.username}**`,
        footer: `their balance: ${currencyEmoji} ${balance}`
    });

	return await embed_pay.send();
}

/** @param {CommandInteraction} interaction */
async function subcommand_customize(interaction) {
	// Get interaction options
	let user = interaction.options.getUser("user");
	let uid = interaction.options.getString("uid");

	/// Fallback
	if (!user) return await error_ES.send({ interaction, description: "You need to give a user ID", ephemeral: true });
	if (!uid) return await error_ES.send({ interaction, description: "You must provide a UID", ephemeral: true });

	// prettier-ignore
	// Create the embed :: { CUSTOMIZED }
	let embed_customize = new BetterEmbed({
		interaction, author: { text: "$USERNAME | customize", iconURL: true }
	});

	// prettier-ignore
	// Check if the user exists in the database
	if (!(await userManager.exists(user.id))) return await embed_customize.send({
		description: "That user has not started yet", ephemeral: true
	});

	// Defer the interaction
	await interaction.deferReply().catch(() => null);

	// Fetch the card from the user's inventory
	let card = await userManager.inventory.get(interaction.user.id, { uid });
	// prettier-ignore
	if (!card) return await embed_customize.send({
		description: `\`${uid}\` is not a valid card UID`
	});

	// Parse the card into a human readable string
	let card_f = cardManager.toString.inventoryEntry(card);

	//* Create the modals
	let modal_customize = new ModalBuilder().setCustomId("modal_customize").setTitle("Customize Card");

	// Inputs
	let components_modal = {
		editInfo: [
			new TextInputBuilder()
				.setCustomId("mti_name")
				.setLabel("Name:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.name)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_description")
				.setLabel("Description:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.description)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_group")
				.setLabel("Group:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.group)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_single")
				.setLabel("Single:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.single)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_category")
				.setLabel("Category:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.category)
				.setRequired(false)
		],

		editDetails: [
			new TextInputBuilder()
				.setCustomId("mti_setid")
				.setLabel("Set ID:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.setID)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_gid")
				.setLabel("Global ID:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.globalID)
				.setRequired(false),

			new TextInputBuilder()
				.setCustomId("mti_sellPrice")
				.setLabel("Sell price:")
				.setStyle(TextInputStyle.Short)
				.setValue(String(card.sellPrice))
				.setRequired(false)
		],

		changeImage: [
			new TextInputBuilder()
				.setCustomId("mti_imageURL")
				.setLabel("Image URL:")
				.setStyle(TextInputStyle.Short)
				.setValue(card.imageURL)
				.setRequired(false)
		]
	};

	// Action rows
	let actionRows_modal = {
		editInfo: components_modal.editInfo.map(textInput => new ActionRowBuilder().addComponents(textInput)),

		editDetails: components_modal.editDetails.map(textInput => new ActionRowBuilder().addComponents(textInput)),

		changeImage: components_modal.changeImage.map(textInput => new ActionRowBuilder().addComponents(textInput))
	};

	//* Create the customizer embed
	let embed = embed_customize
		.setDescription(card_f + `\n\n> ${card.description}`)
		.setImage(card.imageURL)
		.setFooter({ text: "Use the buttons below to customize this card" });

	// Create the customizer's action row
	let buttons_customizer = {
		editInfo: new ButtonBuilder().setLabel("Edit Info").setStyle(ButtonStyle.Secondary).setCustomId("btn_editInfo"),

		editDetails: new ButtonBuilder()
			.setLabel("Edit Details")
			.setStyle(ButtonStyle.Secondary)
			.setCustomId("btn_editDetails"),

		changeImage: new ButtonBuilder()
			.setLabel("Change Image")
			.setStyle(ButtonStyle.Secondary)
			.setCustomId("btn_changeImage"),

		confirm: new ButtonBuilder().setLabel("Confirm").setStyle(ButtonStyle.Success).setCustomId("btn_confirm"),

		cancel: new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Danger).setCustomId("btn_cancel")
	};

	let actionRows_customizer = {
		edit: new ActionRowBuilder().addComponents(
			buttons_customizer.editInfo,
			buttons_customizer.editDetails,
			buttons_customizer.changeImage
		),

		confirmCancel: new ActionRowBuilder().addComponents(buttons_customizer.confirm, buttons_customizer.cancel)
	};

	// Send the customize embed
	let message = await interaction.editReply({
		embeds: [embed],
		components: [actionRows_customizer.edit, actionRows_customizer.confirmCancel]
	});

	//! Collect button interactions
	// Create a filter to look for only button interactions from the user that ran this command
	let filter = i => i.componentType === ComponentType.Button && i.user.id === interaction.user.id;
	// Create a collector to catch interactions | timeout after 10 minutes
	let collector = message.createMessageComponentCollector({ filter, time: 600000 });

	// Refreshes the card info displayed in the embed
	let refreshEmbed = async () => {
		// Re-parse the edited card into a human readable string
		card_f = cardManager.toString.inventoryEntry(card);

		// Change the embed's description and image to display the card
		embed.setDescription(card_f + `\n\n> ${card.description}`).setImage(card.imageURL);

		// Edit the message with the updated embed data
		return await message.edit({ embeds: [embed] }).catch(() => null);
	};

	// Wait for the modal to be submitted and return the modal interaction
	let awaitModal = async () => {
		// Create a filter to look for the right modal
		let modalSubmit_filter = i => i.customId === modal_customize.data.custom_id;
		// Create a collector to catch the modal submit | timeout after 10 minutes
		let modalSubmit = await interaction.awaitModalSubmit({ filter: modalSubmit_filter, time: 600000 });

		// Reset the collector timer
		collector.resetTimer();

		// Close the modal
		try {
			await modalSubmit.deferUpdate();
		} catch {}

		// Return the modal interaction
		return modalSubmit;
	};

	// Triggered whenever a button is pressed in the connected message
	collector.on("collect", async i => {
		// Resets the collector timer
		collector.resetTimer();

		try {
			switch (i.customId) {
				// Show the modal for editing basic info
				case "btn_editInfo":
					// Set the modal components to be relevant to the button the user pressed
					modal_customize.setComponents(...actionRows_modal.editInfo);
					// Show the modal
					try {
						await i.showModal(modal_customize);
					} catch {}

					// Await the returned modal data
					let modalSubmit_editInfo = await awaitModal();

					// Change card data
					let cardName = modalSubmit_editInfo.fields.getTextInputValue("mti_name");
					let cardDescription = modalSubmit_editInfo.fields.getTextInputValue("mti_description");
					let cardGroup = modalSubmit_editInfo.fields.getTextInputValue("mti_group");
					let cardSingle = modalSubmit_editInfo.fields.getTextInputValue("mti_single");
					let cardCategory = modalSubmit_editInfo.fields.getTextInputValue("mti_category");

					card.name = cardName;
					components_modal.editInfo[0].setValue(cardName);
					card.description = cardDescription;
					components_modal.editInfo[1].setValue(cardDescription);
					card.group = cardGroup;
					components_modal.editInfo[2].setValue(cardGroup);
					card.single = cardSingle;
					components_modal.editInfo[3].setValue(cardSingle);
					card.category = cardCategory;
					components_modal.editInfo[4].setValue(cardCategory);

					return await refreshEmbed();

				case "btn_editDetails":
					// Set the modal components to be relevant to the button the user pressed
					modal_customize.setComponents(...actionRows_modal.editDetails);
					// Show the modal
					try {
						await i.showModal(modal_customize);
					} catch {}

					// Await the returned modal data
					let modalSubmit_editDetails = await awaitModal();

					// Change card data
					let cardSetID = modalSubmit_editDetails.fields.getTextInputValue("mti_setid");
					let cardGlobalID = modalSubmit_editDetails.fields.getTextInputValue("mti_gid");
					let cardSellPrice = modalSubmit_editDetails.fields.getTextInputValue("mti_sellPrice");

					card.setID = cardSetID;
					components_modal.editDetails[0].setValue(cardSetID);
					card.globalID = cardGlobalID;
					components_modal.editDetails[1].setValue(cardGlobalID);
					card.sellPrice = +cardSellPrice;
					components_modal.editDetails[2].setValue(cardSellPrice);

					return await refreshEmbed();

				case "btn_changeImage":
					// Set the modal components to be relevant to the button the user pressed
					modal_customize.setComponents(...actionRows_modal.changeImage);
					// Show the modal
					try {
						await i.showModal(modal_customize);
					} catch {}

					// Await the returned modal data
					let modalSubmit_changeImage = await awaitModal();

					// Change card data
					let cardImageURL = modalSubmit_changeImage.fields.getTextInputValue("mti_imageURL");

					card.imageURL = cardImageURL;
					components_modal.changeImage[0].setValue(cardImageURL);

					return await refreshEmbed();

				case "btn_confirm":
					// Allow the button to know it was submitted
					i.deferUpdate();

					// Update the user's card in Mongo
					await userManager.inventory.update(user.id, card);

					// Let the user know the result
					await embed_customize.send({
						method: "followUp",
						description: `Successfully edited card \`${uid}\` for user \`${user.id}\``
					});

					// End the collector
					collector.stop();
					return;

				case "btn_cancel":
					// Delete the customize message
					try {
						await message.delete();
					} catch {}

					// End the collector
					collector.stop();
					return;
			}
		} catch (err) {}
	});

	// Delete the message on timeout
	collector.on("end", async () => {
		try {
			await message.edit({ components: [] });
		} catch {}
	});
}

module.exports = {
	options: { deferReply: false, botAdminOnly: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("admin")
        .setDescription("Commands for admins of Heejin")
    
        .addStringOption(option => option.setName("command").setDescription("The command you want to use")
            .setRequired(true)
            .addChoices(
                { name: "💻 server", value: "server" },
                { name: "💭 test", value: "test" },
                { name: "🪶 summon", value: "summon" },
                { name: "🥕 pay", value: "pay_carrot" },
                { name: "🎀 pay", value: "pay_ribbon" },
                { name: "🃏 customize", value: "customize" },
            )
        )

        .addUserOption(options => options.setName("user").setDescription("The user"))
        .addNumberOption(options => options.setName("amount").setDescription("Amount to pay (use negative to withdraw)"))
		.addStringOption(options => options.setName("server").setDescription("ID of the server to **LEAVE**"))
		.addStringOption(options => options.setName("gid").setDescription("GID of the card (separate by comma)"))
		.addStringOption(options => options.setName("uid").setDescription("UID of the card")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let command = interaction.options.getString("command");

		// prettier-ignore
		switch (command) {
            case "test": return await subcommand_test(client, interaction);
            case "server": return await subcommand_server(client, interaction);
            case "summon": return await subcommand_summon(client, interaction);
            case "pay_carrot": return await subcommand_payUser(interaction, "balance");
            case "pay_ribbon": return await subcommand_payUser(interaction, "ribbon");
            case "customize": return await subcommand_customize(interaction);
		}
	}
};
