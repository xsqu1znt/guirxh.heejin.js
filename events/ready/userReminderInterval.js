/** @file Executed as soon as the bot's connected to Discord */

const { Client, userMention } = require("discord.js");

const { UserReminder } = require("../../modules/mongo/uM_reminders");
const { reminder_ES } = require("../../modules/embedStyles");
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

				/* - - - - - { Pre-Fetch Guilds } - - - - - */
				let reminderGuilds = [];

				// Iterate through and fetch each guild the reminder was set in if needed
				for (let reminder of userReminders) {
					if (!reminder.mode === "channel") continue;
					if (reminderGuilds.find(g => g.id === reminder.guildID)) continue; // ignores duplicate guilds

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
					if (reminderChannels.find(c => c.id === reminder.channelID)) continue; // ignores duplicate channels

					// Get the pre-fetched guild from the array
					let _guild = reminderGuilds.find(g => g.id === reminder.guildID);
					if (!_guild) continue;

					// prettier-ignore
					// Fetch the channel from the guild
					let channel = _guild.channels.cache.get(reminder.channelID) || (await _guild.channels.fetch(reminder.channelID).catch(() => null))
					if (channel) reminderChannels.push(channel);
				}

				/* - - - - - { Parse Reminders } - - - - - */
				/** @param {UserReminder} reminder */
				const executeReminder = async reminder => {
					// Reset the reminder's timestamp
					userManager.reminders.set0(user.id, reminder.type);

					/* - - - - - { Get the Required Guilds and Channels } - - - - - */
					let channelMode = reminder.mode === "channel";

					// Get the guild the reminder was set in
					let guild = channelMode ? reminderGuilds.find(g => g.id === reminder.guildID) : null;

					// prettier-ignore
					// Send an error message :: { GUILD NOT FOUND }
					if (!guild && channelMode) return logger.error(
						"Failed to send reminder",
						"Guild could not be fetched",
						`user: ${user.id} | type: ${reminder.type} | guild: ${reminder.guildID} | channel: ${reminder.channelID}`
					);

					// Get the channel the reminder was set in
					let channel = channelMode ? reminderChannels.find(c => c.id === reminder.channelID) : null;

					// prettier-ignore
					// Send an error message :: { CHANNEL NOT FOUND }
					if (!channel && channelMode) return logger.error(
						"Failed to send reminder",
						"Channel could not be fetched",
						`user: ${user.id} | type: ${reminder.type} | guild: ${reminder.guildID} | channel: ${reminder.channelID}`
					);

					/* - - - - - { Send the Reminder } - - - - - */
					let embed_reminder = reminder_ES(reminder.type);

					// prettier-ignore
					// Send the reminder to the channel
					if (channelMode) return await channel.send({
						content: `${userMention(user.id)} You've got a reminder!`,
						embeds: [embed_reminder]
					});

					// prettier-ignore
					// DM the user their reminder
					return await user.send({
						content: `${userMention(user.id)} You've got a reminder!`,
						embeds: [embed_reminder]
					});
				};

				for (let reminder of userReminders) executeReminder(reminder);
			}
		};

		// prettier-ignore
		// Execute the function every (x) milliseconds
		if (config.bot.SEND_USER_REMINDERS) setInterval(doTheThing, jt.parseTime(config.bot.timeouts.USER_REMINDER_INTERVAL));
	}
};
