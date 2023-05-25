const {
    CommandInteraction,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    GuildMember,
    User,
    Message
} = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { botSettings: { embed: embed_defaults, customEmojis, timeout: timeouts } } = require('../configs/heejinSettings.json');
const { randomTools, arrayTools, dateTools } = require('./jsTools');
const logger = require('./logger');

//! Message Tools
class bE_constructorOptions {
    constructor() {
        /** @type {CommandInteraction | null} */
        this.interaction = null;

        this.author = {
            /** @type {GuildMember | User | null} */
            user: null, text: "", iconURL: "", linkURL: ""
        };

        this.title = { text: "", linkURL: "" };
        this.imageURL = "";
        this.description = "";
        this.footer = { text: "", iconURL: "" };

        this.color = embed_defaults.color || null;

        this.showTimestamp = false;
    }
}

class bE_sendOptions {
    constructor() {
        /** Add a message outside of the embed. */
        this.messageContent = "";

        /** Send the embed with a new description.
         * 
         * Useful for cleaner code. */
        this.description = "";

        /** Send the embed with a new image.
         * 
         * Useful for cleaner code. */
        this.imageURL = "";

        /** The method to send the embed.
         * 
         * If "reply" isn't possible, it will fallback to "editReply".
         * 
         * @type {"reply" | "editReply" | "followUp" | "send"} */
        this.method = "reply";

        /** Send the message as ephemeral. */
        this.ephemeral = false;
    }
}

/** A better embed builder. */
class BetterEmbed extends EmbedBuilder {
    /**
     * @example
     // Text formatting shorthand:
     * "%AUTHOR_NAME" = "the author's display/user name"
     * 
     * @param {bE_constructorOptions} options */
    constructor(options) {
        super(); options = { ...new bE_constructorOptions(), ...options };

        /// Variables
        this.interaction = options.interaction;
        this.author = options.author;

        /// Configure the embed
        //* Embed Author
        if (this.author.text) this.setAuthor({
            name: this.author.text
                // Formatting shorthand
                .replace("%AUTHOR_NAME", this.author.user?.displayName || this.author.user?.username)
        });

        if ((this.author.iconURL || this.author.user) && this.author.iconURL !== null) this.setAuthor({
            name: this.data.author?.name || null, iconURL: this.author.iconURL
                || (this.author.user?.user.avatarURL({ dynamic: true }) || this.author.user?.avatarURL({ dynamic: true }))
        });

        if (this.author.linkURL) this.setAuthor({
            name: this.data.author?.name, iconURL: this.data.author.icon_url,
            url: this.author.linkURL
        });

        //* Embed Title
        if (options.title.text) this.setTitle(options.title.text
            // Formatting shorthand
            .replace("%AUTHOR_NAME", options.author.user?.displayName || options.author.user?.username)
        );

        if (options.title.linkURL) this.setURL(options.title.linkURL);

        //* Embed Description
        if (options.description) this.setDescription(options.description);

        //* Embed Image
        if (options.imageURL) try {
            this.setImage(options.imageURL);
        } catch {
            logger.error("Failed to create embed", `invalid image URL: \`${options.imageURL}\``); return null;
        }

        //* Embed Footer
        if (options.footer.text) this.setFooter({ text: options.footer.text, iconURL: options.footer.iconURL });
        if (options.footer.iconURL) this.setFooter({
            text: this.data.footer.text, iconURL: options.footer.iconURL
        });

        //* Embed Color
        if (options.color) this.setColor(options.color);

        //* Embed Timestamp
        if (options.showTimestamp) this.setTimestamp();
    }

    /** Send the embed using the given interaction.
     * 
     * @example
     // Text formatting shorthand:
     * "%AUTHOR_NAME" = "the author's display/user name"
     * "%AUTHOR_MENTION" = "the author's mention"
     * 
     * @param {bE_sendOptions} options */
    async send(options) {
        options = { ...new bE_sendOptions(), ...options };

        // Format message content
        options.messageContent = options.messageContent
            // Formatting shorthand
            .replace("%AUTHOR_NAME", this.author.user?.displayName || this.author.user?.username)
            .replace("%AUTHOR_MENTION", this.author.user?.toString());

        // Change the embed's description if applicable
        if (options.description) this.setDescription(options.description
            // Formatting shorthand
            .replace("%AUTHOR_NAME", this.author.user?.displayName || this.author.user?.username)
            .replace("%AUTHOR_MENTION", this.author.user?.toString())
        );

        // Change the embed's image if applicable
        if (options.imageURL) try {
            this.setImage(options.imageURL);
        } catch {
            logger.error("Failed to send embed", `invalid image URL: \`${options.imageURL}\``); return null;
        }

        // Send the embed
        try {
            switch (options.method) {
                case "reply": try {
                    return await this.interaction.reply({
                        content: options.messageContent,
                        embeds: [this], ephemeral: options.ephemeral
                    });
                } catch { // Fallback to "editReply"
                    return await this.interaction.editReply({
                        content: options.messageContent,
                        embeds: [this]
                    });
                }

                case "editReply": return await this.interaction.editReply({
                    content: options.messageContent,
                    embeds: [this]
                });

                case "followUp": return await this.interaction.followUp({
                    content: options.messageContent,
                    embeds: [this], ephemeral: options.ephemeral
                });

                case "send": return await this.interaction.channel.send({
                    content: options.messageContent,
                    embeds: [this]
                });

                default: logger.error("Failed to send embed", `invalid send method: \"${options.method}\"`); return null;
            }
        } catch (err) {
            logger.error("Failed to send embed", "message_embed.send", err); return null;
        }
    }
}

const paginationButton_emojis = customEmojis.pagination;

/** @type {"short" | "shortJump" | "long" | "longJump" | false} */
const nav_paginationType = null;

/** @type {BetterEmbed | EmbedBuilder | Array<BetterEmbed | EmbedBuilder> | Array<Array<BetterEmbed | EmbedBuilder>>} */
const nav_embedsType = null;

/** @type {BetterEmbed | EmbedBuilder} */
const nav_embedsType2 = null;

class nav_constructorOptions {
    constructor() {
        /** @type {CommandInteraction | null} */
        this.interaction = null;

        /** @type {nav_embedsType} */
        this.embeds = null;

        /** @type {nav_paginationType} */
        this.paginationType = false;
        this.selectMenu = false;

        this.timeout = dateTools.parseStr(botSettings.timeout.pagination);
    }
}

class nav_selectMenuOptionData {
    constructor(idx = 0) {
        this.emoji = "";
        this.label = `page ${idx + 1}`;
        this.description = "";
        this.value = `ssm_o_${idx + 1}`;
        this.isDefault = idx === 0 ? true : false;
    }
}

class nav_sendOptions {
    constructor() {
        /** The method to send the embed.
         * 
         * If "reply" isn't possible, it will fallback to "editReply".
         * 
         * @type {"reply" | "editReply" | "followUp" | "send"} */
        this.method = "reply";

        /** Send the message as ephemeral. */
        this.ephemeral = false;
    }
}

/** Add a navigation system to embeds. */
class EmbedNavigation {
    #createButton(emoji, label, customID) {
        return new ButtonBuilder({
            emoji, label, style: ButtonStyle.Secondary, custom_id: customID
        });
    }

    /** @param {nav_constructorOptions} options */
    constructor(options) {
        options = { ...new nav_constructorOptions(), ...options };
        if (!options.interaction) return logger.error("Failed to navigationate", "interaction not given");

        // Variables
        this.data = {
            interaction: options.interaction,
            /** @type {Message} */
            message: null,

            embeds: options.embeds,

            timeout: options.timeout,

            /** @type {nav_embedsType2} */
            page_current: null,
            page_nestedLength: 0,
            page_idx: { current: 0, nested: 0 },

            selectMenuEnabled: options.selectMenu,
            selectMenuValues: [],

            paginationType: options.paginationType,
            requiresPagination: false, requiresLongPagination: false, canJumpToPage: false,

            messageComponents: [],

            actionRows: {
                selectMenu: new ActionRowBuilder(),
                pagination: new ActionRowBuilder()
            },

            components: {
                selectMenu: new StringSelectMenuBuilder().setCustomId("ssm_pageSelect").setPlaceholder("choose a page to view..."),

                pagination: {
                    toFirst: this.#createButton(paginationButton_emojis.toFirst.emoji, null, "btn_toFirst"),
                    back: this.#createButton(paginationButton_emojis.back.emoji, null, "btn_back"),
                    jump: this.#createButton(paginationButton_emojis.jump.emoji, null, "btn_jump"),
                    next: this.#createButton(paginationButton_emojis.next.emoji, null, "btn_next"),
                    toLast: this.#createButton(paginationButton_emojis.toLast.emoji, null, "btn_toLast")
                }
            }
        }

        // Configure
        if (!Array.isArray(this.data.embeds)) this.data.embeds = [this.data.embeds];

        this.data.actionRows.selectMenu.setComponents(this.data.components.selectMenu);
    }

    /** Toggle the select menu on/off. */
    async toggleSelectMenu() {
        this.data.selectMenuEnabled = !this.data.selectMenuEnabled;

        return await this.refresh();
    }

    /** Add an option to the select menu.
     * @param {nav_selectMenuOptionData} data */
    addToSelectMenu(data) {
        data = { ...new nav_selectMenuOptionData(this.data.selectMenuValues.length), ...data };

        // Append a new value to reference this select menu option
        this.data.selectMenuValues.push(data.value);

        // Create the select menu option
        let option = new StringSelectMenuOptionBuilder()
            .setLabel(data.label)
            .setValue(data.value)
            .setDefault(data.isDefault);

        // Add a description if applicable
        if (data.description) option.setDescription(data.description);

        // Add an emoji if applicable
        if (data.emoji) option.setEmoji(data.emoji);

        // Add the newly created option to the select menu
        this.data.components.selectMenu.addOptions(option);
    }

    /** Remove an option from the select menu using its index.
     * @param {number} idx */
    removeFromSelectMenu(idx) {
        this.data.components.selectMenu.spliceOptions(idx, 1);
    }

    /** Toggle pagination on/off. */
    async togglePagination() {
        this.data.paginationType = false;

        return await this.refresh();
    }

    /** Set pagination type. Set to false to disable.
     * @param {nav_paginationType} type */
    async setPaginationType(type) {
        this.data.paginationType = type;

        // await this.refresh();
    }

    #updatePagination() {
        this.#updateCurrentPage();

        // Shorthand variables
        let ar_pagination = this.data.actionRows.pagination;
        let btns_nav = this.data.components.pagination;

        // Set pagination buttons depending on the circumstance
        if (this.data.requiresPagination) switch (this.data.paginationType) {
            case "short": ar_pagination.setComponents(
                btns_nav.back, btns_nav.next
            ); break;

            case "shortJump": ar_pagination.setComponents(...this.data.canJumpToPage
                ? [btns_nav.back, btns_nav.jump, btns_nav.next]
                : [btns_nav.back, btns_nav.next]
            ); break;

            case "long": ar_pagination.setComponents(...this.data.requiresLongPagination
                ? [btns_nav.toFirst, btns_nav.back, btns_nav.next, btns_nav.toLast]
                : [btns_nav.back, btns_nav.next]
            ); break;

            case "longJump": ar_pagination.setComponents(...this.data.requiresLongPagination
                ? this.data.canJumpToPage
                    ? [btns_nav.toFirst, btns_nav.back, btns_nav.jump, btns_nav.next, btns_nav.toLast]
                    : [btns_nav.toFirst, btns_nav.back, btns_nav.next, btns_nav.toLast]
                : this.data.canJumpToPage
                    ? [btns_nav.back, btns_nav.jump, btns_nav.next]
                    : [btns_nav.back, btns_nav.next]
            ); break;
        }

        return this.data.requiresPagination ? ar_pagination : null;
    }

    #updateCurrentPage() {
        let page = this.data.embeds[this.data.page_idx.current];

        if (page?.length)
            this.data.page_current = page[this.data.page_idx.nested];
        else
            this.data.page_current = page;

        // Keep track of how many nested pages are on this page
        this.data.page_nestedLength = page?.length || 0;

        // Determine whether or not pagination is required
        this.data.requiresPagination = page?.length >= 2;

        // Check whether or not it would be necessary to use long pagination
        this.data.requiresLongPagination = page?.length >= 4;

        // Check whether or not there's enough pages to enable page jumping
        this.data.canJumpToPage = page?.length >= 4;
    }

    #clampPageIndex() {
        /// Current
        if (this.data.page_idx.current < 0) this.data.page_idx.current = 0;

        if (this.data.page_idx.current > (this.data.embeds.length - 1))
            this.data.page_idx.current = (this.data.embeds.length - 1);

        /// Nested
        if (this.data.page_idx.nested < 0)
            this.data.page_idx.nested = (this.data.page_nestedLength - 1);

        if (this.data.page_idx.nested > (this.data.page_nestedLength - 1))
            this.data.page_idx.nested = 0;
    }

    async #awaitChoosePageNumber() {
        // Tell the user to choose a page number
        let msg = await this.data.message.reply({
            content: `${this.data.interaction.user.toString()} what page do you want to jump to?`
        });

        // Create a message collector to await the user's next message
        let filter = m => m.author.id === this.data.interaction.user.id;
        await msg.channel.awaitMessages({ filter, time: dateTools.parseStr(timeouts.confirmation), max: 1 })
            .then(async collected => {
                // Delete the user's message along with the confirmation message
                await Promise.all([collected.first().delete(), msg.delete()]);

                // Parse the user's message into a number
                let _content = collected.first().content;
                let _number = +_content;

                // Check whether it's a valid number
                if (isNaN(_number) || (_number > this.data.page_nestedLength && _number < 0))
                    // Send a self destructing error message
                    await message_deleteAfter(await this.data.interaction.followUp({
                        content: `${this.data.interaction.user.toString()} \`${_content}\` is an invalid page number`
                    }), dateTools.parseStr(timeouts.errorMessage));

                // Set the nested page index
                this.data.page_idx.nested = _number - 1;
            })
            .catch(async () => {
                try { await msg.delete() } catch { };
            });
    }

    /** Refresh the message with the current page and components. */
    async refresh() {
        // Check if the message is editable
        if (!this.data.message?.editable) {
            logger.error("(Navigationator) Failed to edit message", "message not sent/editable");
            return null;
        }

        this.#updateCurrentPage();

        // Reset message components
        this.data.messageComponents = [];

        // Add the select menu if enabled
        if (this.data.selectMenuEnabled)
            this.data.messageComponents.push(this.data.actionRows.selectMenu);

        // Add pagination if enabled
        if (this.data.paginationType && this.#updatePagination())
            this.data.messageComponents.push(this.data.actionRows.pagination);

        // Edit & return the message
        this.data.message = await this.data.message.edit({
            embeds: [this.data.page_current], components: this.data.messageComponents
        }); return this.data.message;
    }

    /** Send the embed with navigation.
     * @param {nav_sendOptions} options */
    async send(options) {
        options = { ...new nav_sendOptions(), ...options }; this.#updateCurrentPage();

        // Add the select menu if enabled
        if (this.data.selectMenuEnabled)
            this.data.messageComponents.push(this.data.actionRows.selectMenu);

        // Add pagination if enabled
        if (this.data.paginationType && this.#updatePagination())
            this.data.messageComponents.push(this.data.actionRows.pagination);

        // Send the message
        try {
            switch (options.method) {
                case "reply": try {
                    this.data.message = await this.data.interaction.reply({
                        embeds: [this.data.page_current], ephemeral: options.ephemeral,
                        components: this.data.messageComponents
                    }); break;
                } catch { // Fallback to "editReply"
                    this.data.message = await this.data.interaction.editReply({
                        embeds: [this.data.page_current], components: this.data.messageComponents
                    }); break;
                }

                case "editReply": this.data.message = await this.data.interaction.editReply({
                    embeds: [this.data.page_current], components: this.data.messageComponents
                }); break;

                case "followUp": this.data.message = await this.data.interaction.followUp({
                    embeds: [this.data.page_current], ephemeral: options.ephemeral,
                    components: this.data.messageComponents
                }); break;

                case "send": this.data.message = await this.data.interaction.channel.send({
                    embeds: [this.data.page_current], components: this.data.messageComponents
                }); break;

                default: logger.error("Failed to send embed", `invalid send method: \"${options.method}\"`); return null;
            }
        } catch (err) {
            logger.error("Failed to send embed", "message_embed.send", err); return null;
        }

        // Collect message component interactions & return the message
        this.#collectInteractions(); return this.data.message;
    }

    async #collectInteractions() {
        // Create an interaction collector
        let filter = i => i.user.id === this.data.interaction.user.id;
        let collector = this.data.message.createMessageComponentCollector({ filter, time: this.data.timeout });

        collector.on("collect", async i => {
            // Defer the interaction and reset the collector's timer
            await i.deferUpdate(); collector.resetTimer();

            // Ignore non-button/select menu interactions
            if (![ComponentType.Button, ComponentType.StringSelect].includes(i.componentType)) return;

            switch (i.customId) {
                case "ssm_pageSelect":
                    this.data.page_idx.current = this.data.selectMenuValues.findIndex(val => val === i.values[0]);
                    this.data.page_idx.nested = 0;

                    // Change the default select menu option
                    this.data.components.selectMenu.options.forEach(option => option.setDefault(false));
                    this.data.components.selectMenu.options[this.data.page_idx.current].setDefault(true);

                    await this.refresh(); return;

                case "btn_toFirst":
                    this.data.page_idx.nested = 0;
                    await this.refresh(); return;

                case "btn_back":
                    this.data.page_idx.nested--; this.#clampPageIndex();
                    await this.refresh(); return;

                case "btn_jump":
                    await this.#awaitChoosePageNumber();
                    await this.refresh(); return;

                case "btn_next":
                    this.data.page_idx.nested++; this.#clampPageIndex();
                    await this.refresh(); return;

                case "btn_toLast":
                    this.data.page_idx.nested = (this.data.page_nestedLength - 1);
                    await this.refresh(); return;

                default: return;
            }
        });

        // Remove message components on timeout
        collector.on("end", async () => {
            try { await this.data.message.edit({ components: [] }) } catch { };
        });
    }
}

/** Create a simple embed with a description. */
class message_Embedinator {
    /** @param {CommandInteraction} interaction */
    constructor(interaction, options = { author: null, title: "", description: "", footer: "" }) {
        options = { author: null, title: "title", description: "", footer: "", ...options };

        this.interaction = interaction;
        this.author = options.author;
        this.title = options.title
            .replace("%USER", options.author?.username || interaction.user.username);
        this.description = options.description;
        this.footer = options.footer;

        // Create the embed
        this.embed = new EmbedBuilder().setColor(botSettings.embed.color || null);

        if (this.title) this.embed.setAuthor({ name: this.title });
        if (this.description) this.embed.setDescription(this.description);
        if (this.footer) this.embed.setFooter({ text: this.footer });
        if (this.author) this.embed.setAuthor({
            name: this.embed.data.author.name,
            iconURL: this.author.avatarURL({ dynamic: true })
        });
    }

    /** Change the title.
     * @param {string} title The title.
     */
    setTitle(title) {
        this.title = title
            .replace("%USER", this.author.username || this.interaction.user.username);;
    }
    /** Change the embed's author.
     * @param {string} author The author.
     */
    setAuthor(author) { this.author = author; }

    /** Set the description. */
    setDescription(description) { this.description = description; }

    /** Add embed fields.
     * @param {{name: String, value: String, inline: Boolean}} fields
     */
    addFields(...fields) { this.embed.addFields(fields) }

    /** Send the embed.
     * @param {string} description The description of the embed.
     * @param {{sendSeparate: boolean, followUp: boolean, ephemeral: boolean}} options Optional options.
     */
    async send(description = "", options = { sendSeparate: false, followUp: false, ephemeral: false }) {
        options = { sendSeparate: false, followUp: false, ephemeral: false, ...options };

        if (description) this.description = description;

        this.embed.setDescription(this.description);

        // Send the embed
        if (options.followUp)
            return await this.interaction.followUp({ embeds: [this.embed], ephemeral: options.ephemeral });
        else if (options.sendSeparate)
            return await this.interaction.channel.send({ embeds: [this.embed] });
        else
            try {
                return await this.interaction.reply({ embeds: [this.embed], ephemeral: options.ephemeral });
            } catch {
                // If you edit a reply you can't change the message to ephemeral unfortunately
                // unless you do a follow up message and then delete the original reply but that's pretty scuffed
                return await this.interaction.editReply({ embeds: [this.embed] });
            }
    }
}

/** Send a message with a select menu/pagination to switch to different views. */
class message_Navigationify {
    /**
     * @param {CommandInteraction} interaction
     * @param {Array<Embed | Array<Embed>} embedViews
     */
    constructor(interaction, embedViews, options = { pagination: false, selectMenu: false, ephemeral: false, followUp: false, timeout: 0 }) {
        options = {
            pagination: false, selectMenu: false, ephemeral: false, followUp: false,
            timeout: dateTools.parseStr(botSettings.timeout.pagination),
            ...options
        };

        this.interaction = interaction;
        this.fetchedReply = null;

        this.views = embedViews;
        this.options = options;

        this.selectMenu_enabled = options.selectMenu;
        this.selectMenu_values = [];
        this.pagination_enabled = options.pagination;

        this.viewIndex = 0; this.nestedPageIndex = 0;

        this.actionRow = {
            selectMenu: new ActionRowBuilder(),
            pagination: new ActionRowBuilder()
        };

        this.components = {
            stringSelectMenu: new StringSelectMenuBuilder()
                .setCustomId("menu_view")
                .setPlaceholder("make a selection..."),

            pagination: {
                skipFirst: new ButtonBuilder({ label: "◀◀", style: ButtonStyle.Primary, custom_id: "btn_skipFirst" }),
                pageBack: new ButtonBuilder({ label: "◀", style: ButtonStyle.Primary, custom_id: "btn_back" }),
                jump: new ButtonBuilder({ label: "📄", style: ButtonStyle.Primary, custom_id: "btn_jump" }),
                pageNext: new ButtonBuilder({ label: "▶", style: ButtonStyle.Primary, custom_id: "btn_next" }),
                skipLast: new ButtonBuilder({ label: "▶▶", style: ButtonStyle.Primary, custom_id: "btn_skipLast" })
            }
        };

        // Add the select menu component to the selectMenu action row
        this.actionRow.selectMenu.addComponents(this.components.stringSelectMenu);
    }

    addSelectMenuOption(options = { emoji: "", label: "", description: "", isDefault: false }) {
        options = {
            emoji: "",
            label: `option ${this.selectMenu_values.length + 1}`,
            description: "",
            value: `view_${this.selectMenu_values.length + 1}`,
            isDefault: false,
            ...options
        }; this.selectMenu_values.push(options.value);

        // Create a new select menu option
        let newOption = new StringSelectMenuOptionBuilder()
            .setLabel(options.label)
            .setValue(options.value)
            .setDefault(options.isDefault);

        // Add a description if provided
        if (options.description) newOption.setDescription(options.description);

        // Add an emoji if provided
        if (options.emoji) newOption.setEmoji(options.emoji);

        // Add the new option to the select menu
        this.components.stringSelectMenu.addOptions(newOption);
    }

    removeSelectMenuOption(index) {
        this.components.stringSelectMenu.spliceOptions(index);
    }

    determinePageinationStyle() {
        let nestedPageCount = this.views[this.viewIndex]?.length || 0;

        this.actionRow.pagination.setComponents(
            this.components.pagination.pageBack,
            this.components.pagination.jump,
            this.components.pagination.pageNext
        );

        /* if (nestedPageCount > 1) this.actionRow.pagination.setComponents(
            this.components.pagination.pageBack,
            this.components.pagination.pageNext
        );

        if (nestedPageCount > 3) this.actionRow.pagination.setComponents(
            this.components.pagination.skipFirst,
            this.components.pagination.pageBack,
            this.components.pagination.jump,
            this.components.pagination.pageNext,
            this.components.pagination.skipLast
        ); */
    }

    async setSelectMenuDisabled(disabled = true) {
        this.components.stringSelectMenu.setDisabled(disabled);
        await this.updateMessageComponents();
    }

    async setPaginationDisabled(disabled = true) {
        this.actionRow.pagination.components.forEach(btn => btn.setDisabled(disabled));
        await this.updateMessageComponents();
    }

    toggleSelectMenu() {
        this.selectMenu_enabled = !this.selectMenu_enabled;
    }

    togglePagination() {
        this.pagination_enabled = !this.pagination_enabled;
    }

    async send() {
        let view = this.views[this.viewIndex];
        if (Array.isArray(view)) view = view[this.nestedPageIndex];

        let replyOptions = {
            embeds: [view],
            components: [],
            ephemeral: this.options.ephemeral
        };

        // If enabled, add in the select menu action row
        if (this.selectMenu_enabled) replyOptions.components.push(this.actionRow.selectMenu);

        // If enabled, add in the pagination action row
        if (this.views[this.viewIndex]?.length > 1 && this.pagination_enabled) {
            this.determinePageinationStyle();
            replyOptions.components.push(this.actionRow.pagination);
        }

        // Send the embed and neccesary components
        if (this.options.followUp)
            this.fetchedReply = await this.interaction.followUp(replyOptions);
        else
            try {
                this.fetchedReply = await this.interaction.reply(replyOptions);
            } catch {
                // If you edit a reply you can't change the message to ephemeral
                // unless you do a follow up message and then delete the original reply but that's pretty scuffed
                this.fetchedReply = await this.interaction.editReply(replyOptions);
            }

        // Collect message component interactions
        this.collectInteractions(); return this.fetchedReply;
    }

    async update(resetNestedIndex = false) {
        if (resetNestedIndex) this.nestedPageIndex = 0;

        let view = this.views[this.viewIndex];
        if (Array.isArray(view)) view = view[this.nestedPageIndex];

        let replyOptions = {
            embeds: [view],
            components: [],
            ephemeral: this.options.ephemeral
        };

        // If enabled, add in the select menu action row
        if (this.selectMenu_enabled) replyOptions.components.push(this.actionRow.selectMenu);

        // If enabled, add in the pagination action row
        if (this.views[this.viewIndex]?.length > 1 && this.pagination_enabled) {
            this.determinePageinationStyle();
            replyOptions.components.push(this.actionRow.pagination);
        }

        // Set the option the user picked as default so the select menu shows the relevant option selected
        if (this.selectMenu_enabled) {
            this.components.stringSelectMenu.options.forEach(option => option.setDefault(false));
            this.components.stringSelectMenu.options[this.viewIndex].setDefault(true);
        }

        await this.fetchedReply.edit(replyOptions);
    }

    async collectInteractions() {
        // Collect button interactions
        let filter = i => i.user.id === this.interaction.user.id;
        let collector = this.fetchedReply.createMessageComponentCollector({ filter, time: this.options.timeout });

        collector.on("collect", async i => {
            // Defer the interaction and reset the collector's timer
            await i.deferUpdate(); collector.resetTimer();

            // Ignore interactions that aren't dealing with the select menu or pagination buttons
            if (![ComponentType.Button, ComponentType.StringSelect].includes(i.componentType)) return;

            switch (i.customId) {
                case "menu_view":
                    let changeView = this.selectMenu_values.findIndex(v => v === i.values[0]);
                    if (changeView >= 0) {
                        this.viewIndex = changeView;
                        return await this.update(true);
                    }

                case "btn_skipFirst": this.nestedPageIndex = 0; break;

                case "btn_back":
                    this.nestedPageIndex--;
                    if (this.nestedPageIndex < 0) this.nestedPageIndex = this.views[this.viewIndex].length - 1;

                    break;

                case "btn_jump":
                    // Let the user know what action they should take
                    let _msg = await this.interaction.followUp({
                        content: `${this.interaction.user} say the page number you want to jump to`
                    });

                    // Create a new message collector and await the user's next message
                    let filter_temp = m => m.author.id === this.interaction.user.id;
                    await this.interaction.channel.awaitMessages({ filter: filter_temp, time: 10000, max: 1 })
                        .then(async collected => {
                            // Delete the user's number message along with our previous message telling the user what to do
                            collected.first().delete(); _msg.delete();

                            // Convert the collected message to a number
                            let pageNum = Number(collected.first().content);

                            // Check if the collected page number is actually a number, and that embed page is available
                            if (isNaN(pageNum) || pageNum > this.views[this.viewIndex]?.length || pageNum < 0)
                                // Send a self destructing message to the user stating that the given page number is invalid
                                return await message_deleteAfter(await this.interaction.followUp({
                                    content: `${this.interaction.user} that's an invalid page number`
                                }), 5000);

                            // Update the current page index
                            this.nestedPageIndex = pageNum - 1;
                        });

                    break;

                case "btn_next":
                    this.nestedPageIndex++;
                    if (this.nestedPageIndex > this.views[this.viewIndex].length - 1) this.nestedPageIndex = 0;

                    break;

                case "btn_skipLast": this.nestedPageIndex = (this.views[this.viewIndex].length - 1); break;

                default: return;
            }

            // Update the message
            return await this.update();
        });

        // When the collector times out remove the message's components
        collector.on("end", async () => {
            let msg = null;

            try { msg = await this.interaction.channel.messages.fetch(this.fetchedReply.id) } catch { };

            if (msg) await this.fetchedReply.edit({ components: [] });
        });
    }
}

async function message_awaitConfirmation(interaction, options = { title: "", description: "", footer: "", showAuthor: true, deleteAfter: true, timeout: 0 }) {
    options = {
        title: "Please confirm this action", description: null, showAuthor: true, footer: "",
        deleteAfter: true,
        timeout: dateTools.parseStr(botSettings.timeout.confirmation),
        ...options
    };

    let confirmed = false;

    // Format a dynamic title
    options.title = options.title
        .replace("%USER", options.author?.username || interaction.user.username);

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: options.title })
        .setColor(botSettings.embed.color || null);

    // Set the author of the embed if applicable
    if (options.showAuthor) embed.setAuthor({
        name: embed.data.author.name,
        iconURL: interaction.user.avatarURL({ dynamic: true })
    });

    // Set the embed description
    if (options.description) embed.setDescription(options.description);

    // Set the embed footer
    if (options.footer) embed.setFooter({ text: options.footer });

    // Create the confirm/cancel buttons
    let btn_confirm = new ButtonBuilder({ label: "Confirm", style: ButtonStyle.Success, custom_id: "btn_confirm" });
    let btn_cancel = new ButtonBuilder({ label: "Cancel", style: ButtonStyle.Danger, custom_id: "btn_cancel" });

    // Create the action row
    let actionRow = new ActionRowBuilder()
        .addComponents(btn_confirm, btn_cancel);

    // Send the confirmation message embed
    let message = await interaction.followUp({ embeds: [embed], components: [actionRow] });

    // Create a promise to await the user's decision
    return new Promise(resolve => {
        // Collect button interactions
        let filter = i => (i.componentType === ComponentType.Button) && (i.user.id === interaction.user.id);
        message.awaitMessageComponent({ filter, time: options.timeout }).then(async i => {
            // Will return true since the user clicked the comfirm button
            if (i.customId === "btn_confirm") confirmed = true;

            // Delete the confirmation message
            if (options.deleteAfter) message.delete();
            else await message.edit({ components: [] });

            // Resolve the promise with the confirmation
            return resolve(confirmed);
        }).catch(async () => {
            // Delete the confirmation message if it still exists
            try { await message.delete() } catch { };

            // Return false since the user didn't click anything
            return resolve(confirmed);
        });
    });
}

async function message_deleteAfter(message, time) {
    setTimeout(async () => { try { await message.delete() } catch { } }, time); return null;
}

//! Markdown
const bold = (...str) => `**${str.join(" ")}**`;
const italic = (...str) => `*${str.join(" ")}*`;
const inline = (...str) => `\`${str.join(" ")}\``;
const quote = (...str) => `> ${str.join(" ")}`;
const link = (label, url, tooltip = "") => `[${label}](${url}${tooltip ? ` "${tooltip}"` : ""})`;

/** @param {"left" | "right" | "both"} side */
const space = (side = "both", ...str) => {
    switch (side) {
        case "left": return space ? (" " + str.join(" ")) : (" " + str.join(""));
        case "right": return space ? (str.join(" ") + " ") : (str.join("") + " ");
        case "both": return space ? (" " + str.join(" ") + " ") : (" " + str.join("") + " ");
    }
};

module.exports = {
    BetterEmbed, EmbedNavigation,

    messageTools: {
        Embedinator: message_Embedinator,
        Navigationify: message_Navigationify,

        awaitConfirmation: message_awaitConfirmation,
        deleteAfter: message_deleteAfter
    },

    markdown: { bold, italic, inline, quote, link, space }
};