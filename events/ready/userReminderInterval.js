/** @file Executed as soon as the bot's connected to Discord */

const { Client, userMention } = require("discord.js");

const { UserReminder } = require("../../modules/mongo/uM_reminders");
const { BetterEmbed } = require("../../modules/discordTools");
const { userManager } = require("../../modules/mongo");
const jt = require("../../modules/jsTools");
const logger = require("../../modules/logger");

const config = { bot: require("../../configs/config_bot.json") };

module.exports = {
	name: "USER_REMINDER_INTERVAL",
	event: "ready",

	/** @param {Client} client  */
	execute: async client => {
		const doTheThing = async () => {
			// Fetch the reminders of every user
			let userDatas = await userManager.fetch(null, { type: "reminder" });

			// Iterate through each user
			for (let userData of userDatas) {
				// Check if the user has reminders
				if (!userData?.reminders || !userData?.reminders?.length) continue;

				// Filter out reminders that are either invalid or not enabled
				/** @type {UserReminder[]} */
				let userReminders = userData.reminders.filter(r => {
					if (!r) return false;
					if (!r?.enabled) return false;
					if (!r?.timestamp || r?.timestamp > Date.now()) return false; // this also checks if the reminder is due yet
					if (!r?.type) return false;
					if (!r?.mode) return false;
					if (r?.mode === "channel" && (!r?.channelID || !r?.guildID)) return false;

					return true;
				});

				// Skip this user if there's no reminders
				if (!userReminders.length) continue;

				// prettier-ignore
				// Fetch the user from the client
				let user = client.users.cache.get(userData._id) || (await client.users.fetch(userData._id).catch(() => null));
				if (!user) return logger.error("Failed to check reminders", `User "${user.id}" could not be fetched`);

				/* - - - - - { Parse Reminders } - - - - - */
				/** @param {UserReminder} reminder */
				const executeReminder = async (guilds, channels, reminder) => {
					let channelMode = reminder.mode === "channel";

					// Fetch the guild the reminder was set in
					let guild = channelMode
						? client.guilds.cache.get(reminder.guildID) ||
						  (await client.guilds.fetch(reminder.guildID).catch(() => null))
						: null;

					// prettier-ignore
					// Send an error message :: { GUILD NOT FOUND }
					if (!guild && channelMode) return logger.error(
						"Failed to send reminder",
						"Guild could not be fetched",
						`user: ${user.id} | type: ${reminder.type} | guild: ${reminder.guildID} | channel: ${reminder.channelID}`
					);

					// Fetch the channel the reminder was set in
					let channel = channelMode
						? guild.channels.cache.get(reminder.guildID) ||
						  (await guild.channels.fetch(reminder.guildID).catch(() => null))
						: null;

					// prettier-ignore
					// Send an error message :: { CHANNEL NOT FOUND }
					if (!channel && channelMode) return logger.error(
						"Failed to send reminder",
						"Channel could not be fetched",
						`user: ${user.id} | type: ${reminder.type} | guild: ${reminder.guildID} | channel: ${reminder.channelID}`
					);

					/* - - - - - { Send the Reminder } - - - - - */
					// prettier-ignore
					if (channelMode) return await channel.send({
						content: `${userMention(user.id)} You have a reminder!`,
						embeds: []
					});

					// prettier-ignore
					// DM the user their reminder
					return await user.send({
						content: `${userMention(user.id)} You have a reminder!`,
						embeds: []
					})
				};

				/* - - - - - { Pre-Fetch Guilds } - - - - - */
				let reminderGuilds = [];

				// Iterate through and fetch each guild the reminder was set in if needed
				for (let reminder of userReminders) {
					if (!reminder.mode === "channel") continue;
					if (reminderGuilds.find(g => g.id === reminder.guildID)) continue; // avoids duplicate guilds

					// prettier-ignore
					// Fetch the guild from the client
					let channel = client.guilds.cache.get(r.guildID) || (await client.guilds.fetch(r.guildID).catch(() => null));
					if (channel) reminderGuilds.push(channel);
				}

				/* - - - - - { Pre-Fetch Channels } - - - - - */
				let reminderChannels = [];

				// Iterate through and fetch each guild the reminder was set in if needed
				for (let reminder of userReminders) {
					if (!reminder.mode === "channel") continue;
					if (reminderChannels.find(c => c.id === reminder.channelID)) continue; // avoids duplicate channels

					// Get the pre-fetched guild from the array
					let _guild = reminderGuilds.find(g => g.id === reminder.guildID);
					if (!_guild) continue;

					// prettier-ignore
					// Fetch the channel from the guild
					let channel = client.guilds.cache.get(r.guildID) || (await client.guilds.fetch(r.guildID).catch(() => null));
					if (channel) reminderChannels.push(channel);
				}

				/* let _guilds = await Promise.all(userReminders.map(async r => {
					if (!r.mode === "channel") return null;

					// Fetch the guild from the client
					return client.guilds.cache.get(r.guildID) || (await client.guilds.fetch(r.guildID).catch(() => null)) || null;
				})); */

				let _channels = [];

				for (let reminder of userReminders) {
				}
			}
		};

		// Execute the function every (x) milliseconds
		setInterval(doTheThing, jt.parseTime(config.bot.timeouts.USER_REMINDER_INTERVAL));
	}
};
