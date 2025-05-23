const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { messageTools } = require('../modules/discordTools');
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
        // Reusable embedinator to send success/error messages
        const embedinator = new messageTools.Embedinator(interaction, {
            title: "%USER | pay", author: interaction.user
        });

        // Get interaction options
        let amount = interaction.options.getNumber("amount");
        if (amount < 1) return embedinator.send(
            `You cannot give less than \`${botSettings.currencyIcon} 1\``
        );

        let recipient = interaction.options.getUser("player");
        if (recipient.id === interaction.user.id) return await embedinator.send(
            "You cannot pay yourself, silly!"
        );

        // Fetch the users from Mongo
        let userData = await userManager.fetch(interaction.user.id, "essential", true);
        let recipientData = await userManager.fetch(recipient.id, "essential", true);

        // Check if the recipient user exists in Mongo
        let recipientExists = await userManager.exists(recipient.id);
        if (!recipientExists) return await embedinator.send(
            "That user has not started yet"
        );

        // Check if the user has enough
        if (userData.balance < amount) return await embedinator.send(
            `You do not have enough!\nYou're missing \`${botSettings.currencyIcon} ${amount - userData.balance}\``
        );

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
        return await embedinator.send(
            `You gave \`${amount_f}\` to **${recipient}**.\nBalance currently: \`${balance_f}\``
        );
    }
};