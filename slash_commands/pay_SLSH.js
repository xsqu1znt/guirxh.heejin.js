const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../configs/heejinSettings.json');
const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo');
const messenger = require('../modules/messenger');

module.exports = {
    options: { icon: "🥕", deferReply: true },

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
        let embed_pay = new BetterEmbed({
            interaction, author: { text: "%AUTHOR_NAME | gift", user: interaction.member }
        });

        // Interaction options
        let amount = interaction.options.getNumber("amount");

        // A player cannot give less than 🥕 1
        if (amount < 1) return await embed_pay.send({
            description: `You cannot give less than \`${currencyIcon} 1\``
        });

        let recipient = interaction.options.getUser("player");

        // A player can't send 🥕 to themselves
        if (recipient.id === interaction.user.id) return await embed_pay.send({
            description: "You cannot pay yourself, silly!"
        });

        // Check if the recipient player started
        if (!await userManager.exists(recipient.id)) return await embed_pay.send({
            description: "That user has not started yet"
        });

        // Fetch the user from Mongo
        let userData = await userManager.fetch(interaction.user.id, "essential", true);

        // Check if the user has enough 🥕
        if (userData.balance < amount) return await embed_pay.send({
            description: `You do not have enough!\nYou only have \`${currencyIcon} ${userData.balance}\``
        });

        // Fetch the recipient from Mongo
        let recipientData = await userManager.fetch(recipient.id, "essential", true);

        // Update the users' balance in Mongo
        await Promise.all([
            // Subtract from the user's balance
            userManager.update(interaction.user.id, { $inc: { balance: -amount } }),
            // Add to the recipient's balance
            userManager.update(recipient.id, { $inc: { balance: amount } })
        ]);

        // Send the final embeds
        let amount_f = `\`${currencyIcon} ${amount}\``;
        let balance_user_f = `\`${currencyIcon} ${userData.balance - amount}\``;
        let balance_recipient_f = `\`${currencyIcon} ${recipientData.balance + amount}\``;

        return await Promise.all([
            // Let the user know the result
            embed_pay.send({ description: `You gave ${amount_f} to **${recipient}**\n> Balance currently: ${balance_user_f}` }),
            // Send a DM to the recipient
            messenger.gift.currency(recipient, interaction.user, amount, balance_recipient_f)
        ]);
    }
};