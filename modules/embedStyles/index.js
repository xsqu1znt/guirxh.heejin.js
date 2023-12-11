const { User, GuildMember } = require("discord.js");

const { BetterEmbed } = require("../discordTools");
const general_ES = require("./style_general");
const user_ES = require("./style_user");
const jt = require("../jsTools");

const error_ES = new BetterEmbed({ author: { text: "⛔ Something is wrong" } });
const cooldown_ES = new BetterEmbed({ author: { text: "⏳ Cooldown" } });

// prettier-ignore
/** @param {GuildMember|User} user @param {import("../mongo/uM_cooldowns").CooldownType} reminderType */
const reminder_ES = (user, reminderType) => new BetterEmbed({
    author: { text: "⏰ Reminder", user },
    description: `Hey $USER, your \`${jt.toTitleCase(reminderType.replace("_", ""))}\` is **available**!`
});

module.exports = { user_ES, general_ES, error_ES, cooldown_ES, reminder_ES };
