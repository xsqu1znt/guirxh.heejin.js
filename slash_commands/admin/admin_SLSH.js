const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { BetterEmbed } = require("../../modules/discordTools/_dsT");
const { error_ES } = require("../../modules/embedStyles/index");
const { userManager } = require("../../modules/mongo/index");
const messenger = require("../../modules/messenger");
const _jsT = require("../../modules/jsTools/_jsT");

const config = { bot: require("../../configs/config_bot.json") };

/** @param {CommandInteraction} interaction @param {"carrot"|"ribbon"} currencyType */
async function payUser(interaction, currencyType) {
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
                // { name: "🪶 summon", value: "summon" },
                { name: "🥕 pay", value: "pay_carrot" },
                { name: "🎀 pay", value: "pay_ribbon" },
            )
        )

        .addUserOption(options => options.setName("user").setDescription("The user"))
        .addNumberOption(options => options.setName("amount").setDescription("Amount to pay (use negative to withdraw)")),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let command = interaction.options.getString("command");

		// prettier-ignore
		switch (command) {
            case "pay_carrot": return await payUser(interaction, "carrot");
            case "pay_ribbon": return await payUser(interaction, "ribbon");
		}
	}
};
