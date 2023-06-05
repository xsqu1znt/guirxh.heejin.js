const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const subcommands = {
    cardSummon: require('./admin_SLSH_CG/_card_summon'),
    servers: require('./admin_SLSH_CG/_servers')
};

module.exports = {
    builder: new SlashCommandBuilder().setName("admin")
        .setDescription("A collection of admin commands")

        ///admin summoncard
        .addSubcommand(subcommand => subcommand.setName("summoncard")
            .setDescription("Summon a card and add it to a user's inventory")

            .addStringOption(option => option.setName("userid")
                .setDescription("ID of the user")
                .setRequired(true)
            )

            .addStringOption(option => option.setName("gid")
                .setDescription("Use GID separate by comma")
                .setRequired(true)
            )
        )

        ///admin servers
        .addSubcommand(subcommand => subcommand.setName("servers")
            .setDescription("Show every server the bot's in")
        ),

    isOwnerCommand: true,

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     */
    execute: async (client, interaction) => {
        // Determine the operation to execute
        switch (interaction.options.getSubcommand()) {
            case "summoncard": return await subcommands.cardSummon.execute(client, interaction);

            case "servers": return await subcommands.servers.execute(client, interaction);
        }
    }
};