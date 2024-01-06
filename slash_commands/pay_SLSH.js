const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager, questManager } = require("../modules/mongo/index");
const messenger = require("../modules/messenger");
const jt = require("../modules/jsTools");

const config_bot = require("../configs/config_bot.json");

module.exports = {
	options: { icon: "🥕", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("pay")
        .setDescription("Give a player carrots")
    
        .addUserOption(option => option.setName("player").setDescription("Player you want to pay").setRequired(true))
        .addNumberOption(option => option.setName("amount").setDescription("Amount you want to pay").setRequired(true)),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let recipient = interaction.options.getUser("player");
		let amount = Math.floor(interaction.options.getNumber("amount"));

		// prettier-ignore
		// A player cannot give less than 1 🥕/🎀
		if (amount < 1) return await error_ES.send({
            description: `You cannot give less than \`1\``, ephemeral: true
        });

		// prettier-ignore
		// A player can't pay themselves
		if (recipient.id === interaction.user.id) return await error_ES.send({
            description: "You cannot pay yourself, silly!", ephemeral: true
        });

		// Defer the interaction
		await interaction.deferReply();

		// prettier-ignore
		// Check if the recipient player started
		if (!await userManager.exists(recipient.id)) return await error_ES.send({
            interaction, description: `${recipient} has not started yet`
        });

		// Fetch the user and recipient from Mongo
		let userData = {
			user: await userManager.fetch(interaction.user.id, { type: "balance" }),
			recipient: await userManager.fetch(recipient.id, { type: "balance" })
		};

		// prettier-ignore
		// Check if the user has sufficient carrots to give
		if (userData.user.balance < amount) return await error_ES.send({
            interaction, description: `You do not have enough carrots to give \`${config_bot.emojis.currency_1.EMOJI} ${amount}\``,
            footer: `balance: ${config_bot.emojis.currency_1.EMOJI} ${userData.user.balance}`
        });

		// Update the user and recipient's balance in Mongo
		return await Promise.all([
			// Subtract carrots from the user
			userManager.balance.increment(interaction.user.id, -amount, "balance", "pay"),
			// Add carrots to the recipient
			userManager.balance.increment(recipient.id, amount, "balance", "pay"),
			// Send the embed :: { PAY }
			general_ES.pay(interaction.member, recipient, amount, "carrots").send({ interaction })
		])
			// Trigger the recipient quest progress update
			.then(async () => questManager.updateQuestProgress(recipient));
	}
};
