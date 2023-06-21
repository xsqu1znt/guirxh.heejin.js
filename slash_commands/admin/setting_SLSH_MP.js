const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const subcommands = require('./setting_SUBCMDS');

module.exports = {
    options: { isOwnerCommand: true },

    builder: new SlashCommandBuilder().setName("setting")
        .setDescription("For admins of Heejin only")

        .addStringOption(option => option.setName("section")
            .setDescription("The option you want to use")
            .setRequired(true)
            .addChoices(
                { name: "💻 server", value: "server" },
                { name: "🪶 summon", value: "summon" },
                { name: "🥕 pay", value: "pay" }
            )
        )

        .addStringOption(options => options.setName("serverid")
            .setDescription("ID of the server to leave")
        )

        .addStringOption(options => options.setName("userid")
            .setDescription("ID of the user")
        )

        .addStringOption(options => options.setName("gid")
            .setDescription("GID of the card separate by comma")
        )

        .addNumberOption(options => options.setName("amount")
            .setDescription("Amount of carrots to give use negative number to withdraw")
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Determine the operation to execute
        switch (interaction.options.getString("section")) {
            case "server": return await subcommands.ViewServers(client, interaction);

            case "summon": return await subcommands.SummonCard(client, interaction);

            case "pay": return await subcommands.PayUser(client, interaction);
        }
    }
};