const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const subcommands = require('./settings_SUBCMDS');

module.exports = {
    builder: new SlashCommandBuilder().setName("settings")
        .setDescription("For admins of Heejin only")

        .addStringOption(option => option.setName("option")
            .setDescription("The option you want to use")
            .setRequired(true)
            .addChoices(
                { name: "View Servers", value: "viewServers" },
                { name: "Summon Card", value: "summonCard" },
                { name: "Pay User", value: "payUser" }
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

        .addNumberOption(options => options.setName("carrots")
            .setDescription("Amount of carrots to give (use a negative number to subtact)")
        ),

    isOwnerCommand: true,

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Determine the operation to execute
        switch (interaction.options.getString("option")) {
            case "viewServers": return await subcommands.ViewServers(client, interaction);

            case "summonCard": return await subcommands.SummonCard(client, interaction);

            case "payUser": return await subcommands.PayUser(client, interaction);
        }
    }
};