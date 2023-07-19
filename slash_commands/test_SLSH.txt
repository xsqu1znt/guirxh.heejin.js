const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const { BetterEmbed } = require('../modules/discordTools');
const { userManager } = require('../modules/mongo/index');

module.exports = {
    options: { deferReply: false },

    builder: new SlashCommandBuilder().setName("test")
        .setDescription("A test command for dev stuff"),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        let embed_basic = new BetterEmbed({ interaction, description: "boop" });
        return await embed_basic.send();

        //! Basic embed to test database
        /* await Promise.all([...Array(10)].map(async () => {
            return userManager.userData.update(interaction.user.id, { $inc: { balance: 100 } });
        }));

        let userData = await userManager.userData.fetch(interaction.user.id, { type: "essential" });

        let embed_basic = new BetterEmbed({ interaction, description: `balance: \`🥕 ${userData.balance}\`` });

        return await embed_basic.send(); */
    }
};