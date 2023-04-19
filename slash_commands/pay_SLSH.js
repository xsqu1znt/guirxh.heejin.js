const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { userManager } = require('../modules/mongo');

module.exports = {
    builder: new SlashCommandBuilder().setName("pay")
        .setDescription("Give a player carrots")

        .addNumberOption(option => option.setName("amount")
            .setDescription("How much you want to give")
            .setRequired(true))

        .addUserOption(option => option.setName("player")
            .setDescription("The player you want to give to")
            .setRequired(true)),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Get interaction options
        let amount = interaction.options.getNumber("amount");
        if (amount < 1) return interaction.editReply({
            content: "You can't give less than \`1\`!"
        });

        let recipient = interaction.options.getUser("player");
        if (recipient.id === interaction.user.id) return await interaction.editReply({
            content: "You can't gift to yourself!"
        });

        // Fetch the users from Mongo
        let userData = await userManager.fetch(interaction.user.id, "essential", true);
        let recipientData = await userManager.fetch(recipient.id, "essential", true);

        // Check if the recipient user exists in Mongo
        let recipientExists = await userManager.exists(recipient.id);
        if (!recipientExists) return await interaction.editReply({
            content: "That user hasn't started yet."
        });

        // Check if the user has enough
        if (userData.balance < amount) return await interaction.editReply({
            content: `You don't have enough! You're \`${botSettings.currencyIcon} ${amount - userData.balance}\` short.`
        });

        // Update the users' balance in mongo
        await Promise.all([
            // Subtract from the user's balance
            userManager.update(interaction.user.id, { balance: userData.balance - amount }),
            // Add to the recipient's balance
            userManager.update(recipient.id, { balance: recipientData.balance + amount })
        ]);

        // Let the user know the result
        let amount_f = `\`${botSettings.currencyIcon} ${amount}\``;
        let balance_f = `\`${botSettings.currencyIcon} ${userData.balance - amount}\``;
        return await interaction.editReply({
            content: `You gave \`${amount_f}\` to **${recipient.username}**.\nBalance remaining: \`${balance_f}\``
        });
    }
};