// Runs as soon as the bot's connected to discord.

const { Client, userMention } = require('discord.js');

const { guildManager, userManager } = require('../../modules/mongo');
const { BetterEmbed } = require('../../modules/discordTools');

module.exports = {
    name: "REMINDER_INTERVAL",
    event: "ready",

    /** @param {Client} client */
    execute: async (client) => {
        setInterval(async () => {
            // Fetch all the available guilds saved in Mongo
            let guilds = await guildManager.fetchAll();

            // Iterate over the guilds
            for (let guild of guilds) {
                let reminders = guild.reminders;
                let guild_fetched = client.guilds.cache.get(guild._id);

                // Check if a reminder is due
                for (let reminder of reminders) try {
                    if (reminder.timestamp <= Date.now()) {
                        // Fetch the user from Mongo
                        let userData = await userManager.fetch(reminder.user.id, "essential", true);

                        // Check whether the user has a reminder enabled for that command
                        let userReminder = userData.reminders.find(r => r.type === reminder.type);
                        if (userReminder?.enabled) {
                            // Fetch the channel
                            let channel_fetched = await guild_fetched.channels.fetch(reminder.channelID);

                            // Create the embed
                            let embed_reminder = new BetterEmbed({
                                author: {
                                    text: `${reminder.user.name} | reminder`,
                                    iconURL: guild_fetched.members.me.user.avatarURL({ dynamic: true })
                                }, description: reminder.message
                            });

                            // Send the reminder in the appropriate channel
                            await channel_fetched.send({
                                content: `${userMention(reminder.user.id)} You've got a reminder!`,
                                embeds: [embed_reminder]
                            });
                        }

                        // Remove the reminder from Mongo
                        return await guildManager.reminders.remove(guild._id, reminder.id);
                    }
                } catch (err) { /* console.error(err); */ }
            }
        }, 5000);
    }
};