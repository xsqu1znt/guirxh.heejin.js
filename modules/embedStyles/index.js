const { BetterEmbed } = require("../discordTools/_dsT");
const user_ES = require("./style_user");
const general_ES = require("./style_general");

const error_ES = new BetterEmbed({ author: { text: "⛔ Something is wrong" } });

module.exports = { user_ES, general_ES, error_ES };
