const { Client, CommandInteraction, SlashCommandBuilder } = require('discord.js');

const subcommands = {
    cardSummon: require('./admin_SLSH_CG/_card_summon'),
    cardCustomize: require('./admin_SLSH_CG/_card_customize'),
    servers: require('./admin_SLSH_CG/_servers')
}

module.exports = {
    builder: new SlashCommandBuilder().setName("admin")
        .setDescription("A collection of admin commands")

        //* Card (SCG)
        .addSubcommandGroup(subcommandgroup => subcommandgroup.setName("card")
            .setDescription("A collection of card commands for admins")

            ///admin card summon
            .addSubcommand(subcommand => subcommand.setName("summon")
                .setDescription("Summon a card and add it to a user's inventory")

                .addStringOption(option => option.setName("userid")
                    .setDescription("ID of the user")
                    .setRequired(true)
                )

                .addStringOption(option => option.setName("gid")
                    .setDescription("GID of the card")
                    .setRequired(true)
                )
            )

            ///admin card customize
            .addSubcommand(subcommand => subcommand.setName("customize")
                .setDescription("Customize a card in a user's inventory")

                .addStringOption(option => option.setName("userid")
                    .setDescription("ID of the user")
                    .setRequired(true)
                )

                .addStringOption(option => option.setName("uid")
                    .setDescription("UID of the card")
                    .setRequired(true)
                )
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
            case "summon": return await subcommands.cardSummon.execute(client, interaction);
            case "customize": return await subcommands.cardCustomize.execute(client, interaction);

            case "servers": return await subcommands.servers.execute(client, interaction);
        }
    }
};