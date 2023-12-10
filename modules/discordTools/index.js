const config = require("./dsT_config.json");

const BetterEmbed = require("./dsT_betterEmbed");
const EmbedNavigator = require("./dsT_embedNavigator");

const deleteMessageAfter = require("./dsT_deleteMessageAfter");
const awaitConfirmation = require("./dsT_awaitConfirmation");
const dynaSend = require("./dsT_dynaSend");
const ansi = require("./dsT_ansi");

const jt = require("../jsTools");

/* Check config file for errors */
// prettier-ignore
if (isNaN(jt.parseTime(config.timeouts.PAGINATION)))
	throw new Error("You must provide a valid time string/number for \`timeouts.PAGINATION\`. Fix this in '_dsT_config.json'");
// prettier-ignore
if (!config.timeouts.CONFIRMATION)
	throw new Error("You must provide a valid time string/number for \`timeouts.CONFIRMATION\`. Fix this in '_dsT_config.json'");
// prettier-ignore
if (!config.timeouts.ERROR_MESSAGE)
	throw new Error("You must provide a valid time string/number for \`timeouts.ERROR_MESSAGE\`. Fix this in '_dsT_config.json'");

// prettier-ignore
for (let [key, val] of Object.entries(config.navigator.buttons)) if (!val.TEXT) throw new Error(
	`\`${key}.TEXT\` is an empty value; This is required to be able to use EmbedNavigator. Fix this in \'_dsT_config.json\'`
);

module.exports = {
	BetterEmbed,
	EmbedNavigator,

	deleteMessageAfter,
	awaitConfirmation,
	dynaSend,

	markdown: {
		ansi,
		link: (label, url, tooltip = "") => `[${label}](${url}${tooltip ? ` "${tooltip}"` : ""})`
	}
};
