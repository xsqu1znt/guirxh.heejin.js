const { Client, CommandInteraction, SlashCommandBuilder } = require("discord.js");

const { error_ES, general_ES } = require("../modules/embedStyles/index");
const { userManager } = require("../modules/mongo/index");
const messenger = require("../modules/messenger");
const _jsT = require("../modules/jsTools/_jsT");

const config_bot = require("../configs/config_bot.json");

module.exports = {
	options: { icon: "🥕", deferReply: false },

	// prettier-ignore
	builder: new SlashCommandBuilder().setName("pay")
        .setDescription("Give a player carrots")
    
        .addUserOption(option => option.setName("player").setDescription("Player you want to pay").setRequired(true))
        .addStringOption(option => option.setName("currency").setDescription("Currency you want to give")
            .setRequired(true)
            .addChoices({ name: "🥕 Carrots", value: "carrot" }, { name: "🎀 Ribbons", value: "ribbon" })
        )
        .addNumberOption(option => option.setName("amount").setDescription("Amount you want to pay").setRequired(true)),

	/** @param {Client} client @param {CommandInteraction} interaction */
	execute: async (client, interaction) => {
		let recipient = interaction.options.getUser("player");
		let currency = interaction.options.getString("currency");
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
            interaction, description: "That user has not started yet"
        });

		// Fetch the user and recipient from Mongo
		let userData = {
			user: await userManager.fetch(interaction.user.id, { type: "balance" }),
			recipient: await userManager.fetch(recipient.id, { type: "balance" })
		};

		// Determine the operation
		switch (currency) {
			// Give the recipient carrots
			case "carrot":
				// prettier-ignore
				// Check if the user has sufficient carrots to give
				if (userData.user.balance > amount) return await error_ES.send({
                    interaction, description: `You do not have enough carrots to give \`${config_bot.emojis.currency_1.EMOJI} ${amount}\``,
                    footer: `balance: ${config_bot.emojis.currency_1.EMOJI} ${userData.user.balance}`
                });

				// Update the user and recipient's balance in Mongo
				return await Promise.all([
					// Subtract from the user
					userManager.currency.increment(interaction.user.id, -amount, "carrots", "pay"),
					// Add to the recipient
					userManager.currency.increment(recipient.id, amount, "carrots", pay)
				]);

			// Give the recipient ribbons
			case "ribbon":
				// prettier-ignore
				// Check if the user has sufficient ribbons to give
				if (userData.user.ribbons > amount) return await error_ES.send({
                    interaction, description: `You do not have enough ribbons to give \`${config_bot.emojis.currency_2.EMOJI} ${amount}\``,
                    footer: `ribbons: ${config_bot.emojis.currency_2.EMOJI} ${userData.user.ribbons}`
                });

				// Update the user and recipient's balance in Mongo
				return await Promise.all([
					// Subtract from the user
					userManager.currency.increment(interaction.user.id, -amount, "ribbons", "pay"),
					// Add to the recipient
					userManager.currency.increment(recipient.id, amount, "ribbons", pay)
				]);
		}
	}
};
