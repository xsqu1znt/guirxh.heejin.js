const { Client, CommandInteraction, TimestampStyles, time } = require('discord.js');

const { botSettings: { currencyIcon } } = require('../../configs/heejinSettings.json');
const { BetterEmbed, EmbedNavigator, markdown: { bold, inline, link } } = require('../../modules/discordTools');
const { arrayTools, numberTools } = require('../../modules/jsTools');
const { userManager } = require('../../modules/mongo');
const cardManager = require('../../modules/cardManager');
const messenger = require('../../modules/messenger');
const logger = require('../../modules/logger');

async function ViewServers(client, interaction) {
    // Interaction options
    let serverID = interaction.options.getString("serverid") || null;

    let embed_error = new BetterEmbed({
        interaction, author: { text: "%AUTHOR_NAME | servers", user: interaction.member },
        description: "Could not fetch guilds"
    });

    // Fetch all the guilds the client's currently in
    let guilds_partial = await client.guilds.fetch();

    //* Try to leave the server if an ID is given
    if (serverID) try {
        // Fetch the server based on the given ID
        let guildToLeave = await guilds_partial.find(guild => guild.id === serverID).fetch();

        // Leave the server
        await guildToLeave.leave();

        // Log the leave
        logger.success(`successfully left server (${serverID})`);

        // Let the user know the result
        return await embed_error.send({ description: `Successfully left server: ${inline(true, "🆔", serverID)}` });
    } catch (err) {
        // Log the error
        logger.error("Could not leave server", `server id: ${serverID}`, err);

        // Let the user know that the server couldn't be left
        return await embed_error.send({ description: `Failed to leave server: ${inline(true, "🆔", serverID)}` });
    }

    //* Show the servers the client's currently in
    // Fetch each guild to get the full guild object
    let guilds_full = await Promise.all(guilds_partial.map(guild => guild.fetch()));

    // Sort by join date
    guilds_full = guilds_full.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

    // Parse each guild into a human readable string
    let guilds_full_f = await Promise.all(guilds_full.map(async (guild, idx) => {
        let invite_url = "";

        try {
            // Fetch the inviteManager from the guild
            // only works if the client has the Manage Server permission in that guild
            let inviteManager = await guild.invites.fetch();

            // Get the first active invite in the guild
            let invite = inviteManager.at(0);

            // Create a new temp invite if an invite doesn't already exist | expires in 5 minutes
            invite ||= await guild.invites.create(guild.systemChannelId, {
                maxAge: 60 * 5,
                maxUses: 1
            });

            // Get the invite url
            if (invite) invite_url = invite.url;
        } catch (err) {
            // Log the error
            // logger.error("Could not create server invite", `server id: ${serverID}`, err);
        }

        // Return a formatted guild string
        return "%IDX %GUILD_NAME ・ %GUILD_ID\n> %MEMBER_COUNT : \`📆\` %JOINED"
            .replace("%IDX", inline(`${idx + 1}.`))
            .replace("%GUILD_NAME", bold(invite_url ? link(guild.name, invite_url) : guild.name))
            .replace("%GUILD_ID", inline("🆔", guild.id))
            .replace("%MEMBER_COUNT", inline("👥", guild.memberCount))
            .replace("%JOINED", time(
                numberTools.milliToSeconds(guild.members.me.joinedTimestamp),
                TimestampStyles.LongDate
            ));
    }));

    // Break up the formatted servers to only show 10 per page
    guilds_full_f = arrayTools.chunk(guilds_full_f, 10);

    // Create a page for each chunk
    let embeds_servers = [];
    for (let chunk of guilds_full_f) {
        let _embed = new BetterEmbed({
            author: { text: "%AUTHOR_NAME | servers", user: interaction.member },
            description: chunk.join("\n")
        });

        embeds_servers.push(_embed);
    }

    // Send the embed with navigation
    let embedNav = new EmbedNavigator({ interaction, embeds: [embeds_servers], paginationType: "shortJump" });
    return await embedNav.send();
}

async function SummonCard(client, interaction) {
    // Interaction options
    let userID = interaction.options.getString("userid");
    let globalIDs = interaction.options.getString("gid")?.replace(/ /g, "").split(",");
    if (!Array.isArray(globalIDs)) globalIDs = [globalIDs];

    // Create a base embed        
    let embed_summon = new BetterEmbed({
        interaction, author: { text: "%AUTHOR_NAME | summon", user: interaction.member }
    });

    // Fallback
    if (!userID) return await embed_summon.send({ description: "You need to give a user ID" });

    // Check if the user exists in the database
    if (!await userManager.exists(userID)) return await embed_summon.send({
        description: "That user has not started yet"
    });

    // Fetch the cards from our collection
    let cards = globalIDs.map(globalID => cardManager.get.globalID(globalID)).filter(card => card);
    if (!cards.length) return await embed_summon.send({
        description: "You need to give a valid card ID"
    });

    // Add the cards to the user's card_inventory
    await userManager.cards.add(userID, cards);

    /// Create and send the embeds
    let recipient = await client.users.fetch(userID);

    let card_last = cards.slice(-1)[0] || cards[0];
    let cards_f = cards.map(card => cardManager.toString.basic(card));

    return await Promise.all([
        // Let the user know the result
        embed_summon.send({
            description: `You summoned ${cards.length === 1 ? "\`1 card\`" : `\`${cards.length} cards\``} for **${recipient.username}**\n>>> ${cards_f.join("\n")}`,
            imageURL: card_last.imageURL
        }),
        // Send a DM to the recipient
        messenger.gift.cards(recipient, interaction.user, cards, cards_f)
    ]);
}

async function PayUser(client, interaction) {
    // Interaction options
    let recipientID = interaction.options.getString("userid") || null;
    let amount = interaction.options.getNumber("amount") || 0;

    // Create a base embed
    let embed_payUser = new BetterEmbed({
        interaction, author: { text: "%AUTHOR_NAME | pay", user: interaction.member }
    });

    // Get the recipient User
    let recipient; try { recipient = await client.users.fetch(recipientID); } catch {
        return await embed_payUser.send({ description: "You need to give a valid user ID" });
    }

    // Check if the user gave an amount
    if (!amount) return await embed_payUser.send({ description: `You cannot give \`${currencyIcon} 0\`` });

    // Check if the recipient user started
    if (!await userManager.exists(recipient.id)) return await embed_payUser.send({
        description: "That user has not started yet"
    });

    // Add to the recipient's balance
    await userManager.update(recipient.id, { $inc: { balance: amount } });

    // Fetch the recipient user from Mongo
    let recipientData = await userManager.fetch(recipient.id, "essential");

    // Update the recipient user's balance in Mongo
    await Promise.all([
        // Let the user know the result
        embed_payUser.send({
            description: `You ${amount > 0 ? `gave \`${currencyIcon} ${amount}\` to` : `withdrew \`${currencyIcon} ${amount}\` from`} **${recipient.username}**\n> Their balance: \`${currencyIcon} ${recipientData.balance}\``
        }),
        // Send a DM to the recipient if they were given currency
        (async () => { if (amount > 0) return await messenger.gift.currency(recipient, interaction.user, amount, recipientData.balance); })()
    ]);
}

module.exports = { ViewServers, SummonCard, PayUser };