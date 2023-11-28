/** @typedef options
 * @property {CommandInteraction} interaction
 * @property {{home:User|GuildMember, away:User|GuildMember}} opponents
 * @property {{home:Card, away:Card}} idol */

const { CommandInteraction, User, GuildMember } = require("discord.js");

const { BetterEmbed } = require("./discordTools");
const { userManager } = require("./mongo/index");
const cardManager = require("./cardManager");
const _jsT = require("./jsTools");

const config = {
	player: require("../configs/config_player.json"),
	bot: require("../configs/config_bot.json")
};

class Stage {
	#resolve = null;

	async #sleep() {
		return await _jsT.wait(this.data.timeout.turn);
	}

	async #refresh() {
		return await this.data.interaction.editReply({ embeds: [this.embed] });
	}

	async #countdown() {
		for (let t = this.data.timeout.start; t > 0; t--) {
			this.embed.setFooter(`Duel starting in ${t} ${t === 1 ? "second" : "seconds"}...`);

			// Refresh the embed
			await this.#refresh();
			// Wait 1 second
			await _jsT.wait(1000);
		}
	}

	/** @param {"home"|"away"} teamToAttack */
	#applyDamage(teamToAttack) {
		switch (teamToAttack) {
			case "home":
				// Calculate the resulting attack power :: { AWAY }
				let attackPower_away = _jsT.randomNumber(
					_jsT.percent(30, this.data.idol.away.stats.ability),
					this.data.idol.away.stats.ability
				);

				// prettier-ignore
				// Apply the new HP (reputation) :: { HOME }
				this.data.idol.home.stats.reputation = _jsT.clamp(
						this.data.idol.home.stats.reputation - attackPower_away, { min: 0 }
				);
				break;

			case "away":
				// Calculate the resulting attack power :: { HOME }
				let attackPower_home = _jsT.randomNumber(
					_jsT.percent(30, this.data.idol.away.stats.ability),
					this.data.idol.away.stats.ability
				);

				// prettier-ignore
				// Apply the new HP (reputation) :: { AWAY }
				this.data.idol.away.stats.reputation = _jsT.clamp(
						this.data.idol.away.stats.reputation - attackPower_home, { min: 0 }
				);
				break;
		}
	}

	/** @param {options} options  */
	constructor(options) {
		options = { interaction: null, opponents: { home: null, away: null }, idol: { home: null, away: null }, ...options };

		this.data = {
			interaction: options.interaction,
			opponents: options.opponents,
			idol: options.idol,
			turn: 0,
			timeout: {
				start: _jsT.parseTime(config.bot.timeouts.STAGE_START, { type: "s" }),
				turn: _jsT.parseTime(config.bot.timeouts.STAGE_TURN, { type: "ms" })
			}
		};

		// Get a random idol if one wasn't provided :: { AWAY }
		this.data.idol.away ||= cardManager.get.random({
			type: "all",
			level: { min: options.idol.home.stats.level - 4, max: options.idol.home.stats.level }
		});

		/* - - - - - { Create the Embed } - - - - - */
		this.embed = new BetterEmbed({
			interaction: options.interaction,
			author: { text: "$USERNAME | stage", iconURL: true },
			footer: `Duel starting in ${this.data.timeout.start} ${this.data.timeout.start === 1 ? "second" : "seconds"}...`
		});

		// Add opponent info fields
		this.embed.addFields(
			// Opponent info :: { HOME }
			{
				name: this.data.opponents.home?.displayName || this.data.opponents.home?.username || "Player 1",
				value: cardManager.toString.stage(this.data.idol.home),
				inline: true
			},
			// Opponent info :: { AWAY }
			{
				name: this.data.opponents.away?.displayName || this.data.opponents.away?.username || "Rival",
				value: cardManager.toString.stage(this.data.idol.away),
				inline: true
			}
		);
	}

	async start() {
		return new Promise(async resolve => {
			this.#resolve = resolve;

			// Send the embed
			await this.embed.send();
			// Start the countdown
			await this.#countdown();

			// Choose who goes first
			_jsT.chance() ? this.#attack_away() : this.#attack_home();
		});
	}

	async #attack_home() {
		this.data.turn++;

		// Damage the HOME team
		this.#applyDamage("home");

		// prettier-ignore
		// Update the embed's HOME team field
		this.embed.data.fields[0].value = cardManager.toString.stage(this.data.idol.home);

		/// Refresh the embed
		this.embed.setFooter(`Turn: ${this.data.turn}`);
		await this.#refresh();

		// Attack team AWAY if HOME still has HP (reputation)
		if (this.data.idol.home.stats.reputation) {
			// Sleep until the next turn can be played
			await this.#sleep();
			return await this.#attack_away();
		}

		// End the battle if HOME is out of HP (reputation)
		return this.#end(this.data.opponents.away, this.data.idol.away);
	}

	async #attack_away() {
		this.data.turn++;

		// Damage the AWAY team
		this.#applyDamage("away");

		// Update the embed's AWAY team field
		this.embed.data.fields[1].value = cardManager.toString.stage(this.data.idol.away);

		/// Refresh the embed
		this.embed.setFooter(`Turn: ${this.data.turn}`);
		await this.#refresh();

		// Attack team HOME if AWAY still has HP (reputation)
		if (this.data.idol.away.stats.reputation) {
			// Sleep until the next turn can be played
			await this.#sleep();
			return await this.#attack_home();
		}

		// End the battle if AWAY is out of HP (reputation)
		return this.#end(this.data.opponents.home, this.data.idol.home);
	}

	async #end(user, idol) {
		let xp_user = _jsT.randomNumber(config.player.xp.user.rewards.stage.MIN, config.player.xp.user.rewards.stage.MAX);
		let xp_idol = _jsT.randomNumber(config.player.xp.card.rewards.stage.MIN, config.player.xp.card.rewards.stage.MAX);

		idol.stats.xp += xp_idol;
		let card_leveled = cardManager.levelUp(idol);
		let card = cardManager.parse.toCardLike(card_leveled.card);

		// prettier-ignore
		// Give the winning user/idol XP
		if (user) await Promise.all([
			userManager.inventory.update(user.id, card),
			userManager.levels.increment.xp(user.id, xp_user, "stage")
		]);

		/* - - - - - { Update the Embed } - - - - - */
		switch (user?.id) {
			// HOME won
			case this.data.opponents.home.id:
				this.embed.data.fields[0].name = `\`🏆\` ${this.embed.data.fields[0].name} ***WON!***`;
				this.embed.data.fields[1].name += " ***LOST!***";
				break;

			// AWAY won
			case this.data.opponents.away?.id:
				this.embed.data.fields[0].name += " ***LOST!***";
				this.embed.data.fields[1].name = `\`🏆\` ${this.embed.data.fields[1].name} ***WON!***`;
				break;
		}

		// Set the embed's footer
		this.embed.setFooter(
			user
				? "$WINNER's idol got $XPXP $LEVEL_UP"
						.replace("$WINNER", user?.displayName || user?.username)
						.replace("$XP", xp_idol)
						.replace("$LEVEL_UP", card_leveled.levels_gained ? `and ${card_leveled.levels_gained} LV.` : "")
				: "You lost... Try again next time!"
		);

		// Refresh the embed
		await this.#refresh();

		// Return stage data
		return this.#resolve({
			id: user?.id || null,
			user: user || null,
			user_xp: xp_user,
			idol: { card: card_leveled.card, levels: card_leveled.levels_gained, xp: xp_idol }
		});
	}
}

module.exports = Stage;
