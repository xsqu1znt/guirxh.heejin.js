const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../../modules/discordTools");
const { error_ES } = require("../../modules/embedStyles/index");
const { userManager } = require("../../modules/mongo/index");
const cardManager = require("../../modules/cardManager");
const messenger = require("../../modules/messenger");
const jt = require("../../modules/jsTools");

const config = { bot: require("../../configs/config_bot.json") };

/** @param {Client} client @param {CommandInteraction} interaction */
async function subcommand_summon(client, interaction) {
	// Interaction options
	let user = interaction.options.getUser("user") || null;
	let globalIDs = interaction.options.getString("gid")?.replace(/ /g, "").split(",");
	if (!Array.isArray(globalIDs)) globalIDs = [globalIDs];

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

	// Add the cards to the user's card_inventory
	await userManager.inventory.add(user.id, cards);

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

/** @param {CommandInteraction} interaction @param {"balance"|"ribbons"} currencyType */
async function subcommand_payUser(interaction, currencyType) {
	let user = interaction.options.getUser("user");
	let amount = interaction.options.getNumber("amount");

	if (!user) return await error_ES.send({ interaction, description: "User not found" });
	// prettier-ignore
	if (amount === 0 || typeof amount !== "number") return await error_ES.send({
        interaction, description: "You did not give an amount"
    });

	// Increment the user's balance
	await userManager.balance.increment(user.id, amount, currencyType);

	/* - - - - - { Send Details } - - - - - */
	let userData = await userManager.fetch(user.id, { type: "balance" });
	let currencyEmoji = "";
	let balance = 0;

	// prettier-ignore
	switch (currencyType) {
        case "carrot": currencyEmoji = config.bot.emojis.currency_1.EMOJI; balance = userData.balance; break;
        case "ribbon": currencyEmoji = config.bot.emojis.currency_2.EMOJI; balance = userData.ribbons; break;
    }

	// Let the user know they were given currency
	if (amount > 0) messenger.gift.currency(user, interaction.user, amount, balance, currencyType);

	// prettier-ignore
	// Create the embed :: { ADMIN - PAY }
	let embed_pay = new BetterEmbed({
        interaction, author: { text: "$USERNAME | admin", iconURL: true },
        description: `\`${currencyEmoji} ${amount}\` ${amount > 0 ? "given to" : "withdrawn from"} **${user.username}**`,
        footer: `balance: ${currencyEmoji} ${balance}`
    });

	return await embed_pay.send();
}

module.exports = {
	options: { deferReply: false, botAdminOnly: true },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("admin")
        .setDescription("Commands for admins of Heejin")
    
        .addStringOption(option => option.setName("command").setDescription("The command you want to use")
            .setRequired(true)
            .addChoices(
                // { name: "💻 server", value: "server" },
                { name: "🪶 summon", value: "summon" },
                { name: "🥕 pay", value: "pay_carrot" },
                { name: "🎀 pay", value: "pay_ribbon" },
            )
        )

		.addStringOption(options => options.setName("gid").setDescription("GID of the card (separate by comma)"))
        .addUserOption(options => options.setName("user").setDescription("The user"))
        .addNumberOption(options => options.setName("amount").setDescription("Amount to pay (use negative to withdraw)")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let command = interaction.options.getString("command");

		// prettier-ignore
		switch (command) {
            case "summon": return await subcommand_summon(client, interaction);
            case "pay_carrot": return await subcommand_payUser(interaction, "balance");
            case "pay_ribbon": return await subcommand_payUser(interaction, "ribbons");
		}
	}
};
