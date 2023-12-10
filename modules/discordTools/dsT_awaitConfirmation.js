/** @typedef ac_options
 * Title/description formatting shorthand:
 *
 * • $USER :: interaction user's mention
 *
 * • $USERNAME :: interaction user's display/user name
 *
 * @property {GuildMember|User} user
 * @property {CommandInteraction} interaction
 * @property {Message} message
 * @property {{text:string, useAuthor:boolean}} title
 * @property {string} description
 * @property {string} footer
 * @property {"reply"|"editReply"|"followUp"|"channel"|"edit"} sendMethod if "reply" fails it will use "editReply" | "followUp" is default
 * @property {boolean} showAuthorIcon
 * @property {boolean} deleteOnConfirmation
 * @property {number} timeout */

const config = require("./dsT_config.json");

const {
	CommandInteraction,
	Message,
	GuildMember,
	User,
	ComponentType,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder
} = require("discord.js");
const BetterEmbed = require("./dsT_betterEmbed");
const jt = require("../jsTools");

/** Send a confirmation message and await the user's response
 * @param {ac_options} options */
async function awaitConfirmation(options) {
	// prettier-ignore
	options = {
		interaction: null, message: null,
		title: config.CONFIRMATION_TITLE, description: "", footer: "",
		sendMethod: "followUp",
		showAuthorIcon: false, deleteOnConfirmation: true,
		timeout: jt.parseTime(config.timeouts.CONFIRMATION), ...options
	};

	/// Error Handeling
	if (!options.interaction && !options.message) throw new Error("CommandInteraction or Message not provided");

	/// Create the confirmation embed
	// prettier-ignore
	let embed = new BetterEmbed({
		interaction: options.interaction,
		author: { text: options.title, iconURL: options.showAuthorIcon ? "" : false },
		description: options.description, footer: options.footer
	});

	// prettier-ignore
	// Set the embed's author name or title
	if (options.title.useAuthor)
		embed.data.author.name = options.title.text
	else
		embed.data.title = options.title.text

	// Create the confirm/cancel buttons
	let buttons = {
		confirm: new ButtonBuilder({ label: "Confirm", style: ButtonStyle.Success, custom_id: "btn_confirm" }),
		cancel: new ButtonBuilder({ label: "Cancel", style: ButtonStyle.Danger, custom_id: "btn_cancel" })
	};

	// Action row
	let actionRow = new ActionRowBuilder().addComponents(...Object.values(buttons));

	// Send the confirmation embed
	let message;
	if (options.interaction) message = await embed.send({ sendMethod: options.sendMethod, components: actionRow });
	else if (options.message) message = await options.message.edit({ embeds: [embed], components: [actionRow] });

	// Wait for the user's decision, or timeout
	return new Promise(resolve => {
		// Collect button interactions
		let filter = i =>
			i.componentType === ComponentType.Button && i.user.id === (options.interaction?.user?.id || options.user?.id);

		message
			.awaitMessageComponent({ filter, time: options.timeout })
			.then(async i => {
				await i.deferUpdate();

				// Return true if the user clicked the confirm button
				if (i.customId === "btn_confirm") resolve(true);
				else resolve(false);

				// prettier-ignore
				// Delete/edit the confirmation embed
				if (options.deleteOnConfirmation) try { return await message.delete() } catch { }
				// else try { return await message.edit({components: []}) } catch { }
			})
			.catch(async () => {
				// prettier-ignore
				// Delete/edit the confirmation embed
				if (options.deleteOnConfirmation) try { return await message.delete() } catch { }
				// else try { return await message.edit({components: []}) } catch { }
				return resolve(false);
			});
	});
}

module.exports = awaitConfirmation;
