/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {{home:User|GuildMember, away:User|GuildMember}} opponents
 * @property {{home:Card, away:Card}} idol */

const { CommandInteraction, User, GuildMember } = require("discord.js");

const { BetterEmbed } = require("./discordTools/_dsT");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools/_jsT");
const logger = require("./logger");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

class Stage {
	#resolve = null;

	/** @param {options} options  */
	constructor(options) {
		// prettier-ignore
		options = { interaction: null, opponents: { home: null, away: null }, idol: { home: null, away: null }, ...options };
		options.idol.away ||= cardManager.get.random({ type: "all", level: { min: 1, max: 100 } });

		this.data = {
			interaction: options.interaction,
			opponents: options.opponents,
			idol: options.idol,
			_idol: structuredClone(options.idol),
			turn: 0,
			timeout: {
				start: _jsT.parseTime(config.bot.timeouts.STAGE_START, { type: "s" }),
				turn: _jsT.parseTime(config.bot.timeouts.STAGE_TURN, { type: "s" })
			},

			embed: new BetterEmbed({
				interaction: options.interaction,
				author: { text: "$USERNAME | stage", iconURL: true },
				footer: "Battle starting in $START_TIME..."
			})
        };
        
        this.data.embed.addFields(
            // Team :: { HOME }
            {name: options.opponents.home.displayName || options.opponents.home.username, value: ""},
            // Team :: { AWAY }
            {name: "", value: ""},
        )
	}
}
