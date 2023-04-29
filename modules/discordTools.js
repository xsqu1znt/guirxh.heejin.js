const {
    CommandInteraction,
    Embed,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');
const { randomTools, arrayTools } = require('./jsTools');

// Message Tools
/** Create a simple embed with a description. */
class message_Embedinator {
    /** @param {CommandInteraction} interaction */
    constructor(interaction, options = { title: "", author: null }) {
        options = { title: "", author: null, ...options };

        this.interaction = interaction;
        this.title = options.title
            .replace("%USER", options.author?.username || interaction.user.username);
        this.author = options.author;
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

    /** Send the embed.
     * @param {string} description The description of the embed.
     * @param {{followUp: boolean, ephemeral: boolean}} options Optional options.
     */
    async send(description, options = { followUp: false, ephemeral: false }) {
        options = { followUp: false, ephemeral: false, ...options };

        // Create the embed
        let embed = new EmbedBuilder()
            .setDescription(description)
            .setColor(botSettings.embedColor || null);

        if (this.title) embed.setAuthor({ name: this.title });
        if (this.author) embed.setAuthor({ name: embed.data.author.name, iconURL: this.author.avatarURL({ dynamic: true }) });

        // Send the embed
        if (options.followUp)
            return await this.interaction.followUp({ embeds: [embed], ephemeral: options.ephemeral });
        else
            try {
                return await this.interaction.reply({ embeds: [embed], ephemeral: options.ephemeral });
            } catch {
                // If you edit a reply you can't change the message to ephemeral unfortunately
                // unless you do a follow up message and then delete the original reply but that's pretty scuffed
                return await this.interaction.editReply({ embeds: [embed] });
            }
    }
}

/** Send a message with a customizable select menu to switch to different views. */
class message_SelectMenuinator {
    /**
     * @param {CommandInteraction} interaction
     * @param {Array<Embed | Array<Embed>} embedViews
     */
    constructor(interaction, embedViews, options = { pagination: false, ephemeral: false, followUp: false, timeout: 10000 }) {
        options = { pagination: false, ephemeral: false, followUp: false, timeout: 10000, ...options };

        this.interaction = interaction;
        this.fetchedReply = null;

        this.views = embedViews;
        this.options = options;

        this.selectMenu_enabled = true;
        this.selectMenu_values = [];
        this.pagination_enabled = options.pagination;

        this.viewIndex = 0; this.nestedPageIndex = 0;

        this.actionRow = {
            selectMenu: new ActionRowBuilder(),
            pagination: new ActionRowBuilder()
        };

        this.actionRowComponents = {
            selectMenu: new StringSelectMenuBuilder(),

            pagination: {
                skipFirst: new ButtonBuilder({ label: "◀◀", style: ButtonStyle.Primary, custom_id: "btn_skipFirst" }),
                pageBack: new ButtonBuilder({ label: "◀", style: ButtonStyle.Primary, custom_id: "btn_back" }),
                jump: new ButtonBuilder({ label: "📄", style: ButtonStyle.Primary, custom_id: "btn_jump" }),
                pageNext: new ButtonBuilder({ label: "▶", style: ButtonStyle.Primary, custom_id: "btn_next" }),
                skipLast: new ButtonBuilder({ label: "▶▶", style: ButtonStyle.Primary, custom_id: "btn_skipLast" })
            }
        };

        // Add the select menu component to the selectMenu action row
        this.actionRow.selectMenu.addComponents(this.actionRowComponents.selectMenu);

        this.messageComponents = [this.actionRow.selectMenu];
    }

    addMenuOption(options = { emoji: "", label: "", description: "", isDefault: false }) {
        options = {
            emoji: "",
            label: "Option",
            description: "This is a description.",
            value: `view_${this.selectMenu_values + 1}`,
            isDefault: false,
            ...options
        }; this.selectMenu_values.push(options.value);

        // Create a new select menu option
        let newOption = new StringSelectMenuOptionBuilder()
            .setLabel(options.label)
            .setDescription(options.description)
            .setValue(options.value);

        // Add an emoji if provided
        if (options.emoji) newOption.setEmoji(emoji);

        // Add the new option to the select menu
        this.actionRowComponents.selectMenu.addOptions(newOption);
    }

    removeMenuOption(index) {
        this.actionRowComponents.selectMenu.spliceOptions(index);
    }

    async setMenuDisabled(disabled = true) {
        this.actionRowComponents.selectMenu.setDisabled(disabled);
        await this.updateMessageComponents();
    }

    async setPaginationDisabled(disabled = true) {
        this.actionRow.pagination.components.forEach(btn => btn.setDisabled(disabled));
        await this.updateMessageComponents();
    }

    async toggleMenu() {
        if (this.selectMenu_enabled) {
            delete this.messageComponents[0];
            this.selectMenu_enabled = false;
        } else {
            this.messageComponents = [this.actionRow.selectMenu, ...this.messageComponents];
            this.selectMenu_enabled = true;
        }

        await this.updateComponents();
    }

    async togglePagination() {
        if (this.pagination_enabled) {
            delete this.messageComponents[1];
            this.pagination_enabled = false;
        } else {
            this.messageComponents = [...this.messageComponents, this.actionRow.pagination];
            this.pagination_enabled = true;
        }

        await this.updateComponents();
    }

    async send() {
        let replyOptions = {
            embeds: [this.views[0]],
            components: this.messageComponents,
            ephemeral: this.options.ephemeral
        };

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
        let nestedPageCount = view?.length;
        if (this.pagination_enabled && nestedPageCount > 1) {
            this.actionRow.pagination.setComponents(nestedPageCount > 2
                // Add extra pagination buttons if there are more than 2 pages
                ? [
                    this.actionRowComponents.pagination.skipFirst,
                    this.actionRowComponents.pagination.pageBack,
                    this.actionRowComponents.pagination.jump,
                    this.actionRowComponents.pagination.pageNext,
                    this.actionRowComponents.pagination.skipLast
                ]
                : [
                    this.actionRowComponents.pagination.pageBack,
                    this.actionRowComponents.pagination.pageNext
                ]
            );

            view = view[this.nestedPageIndex];
        }

        await this.fetchedReply.edit({ embeds: [this.views[this.viewIndex]], components: this.messageComponents });
    }

    async collectInteractions() {
        // Keeps track of the current view the user's on
        let curViewIdx = 0;

        // Collect button interactions
        let filter = i => i.user.id === this.interaction.user.id;
        let collector = this.fetchedReply.createMessageComponentCollector({ filter, time: this.options.timeout });

        collector.on("collect", async i => {
            // Defer the interaction and reset the collector's timer
            await i.deferUpdate(); collector.resetTimer();

            // Ignore interactions that aren't dealing with the select menu or pagination buttons
            if (i.componentType !== ComponentType.StringSelect || i.componentType !== ComponentType.Button) return;

            // Execute an action for whichever interaction was used
            let changeView = this.selectMenu_values.findIndex(v => v === i.customID);
            if (changeView >= 0) {
                this.viewIndex = changeView; return await this.update(true);
            }

            // An else case if the user didn't use the select menu
            if (this.pagination_enabled) {
                switch (i.customID) {
                    case "btn_skipFirst": this.nestedPageIndex = 0; break;
                    case "btn_back": this.nestedPageIndex--; break;
                    case "btn_jump": break;
                    case "btn_next": this.nestedPageIndex++; break;
                    case "btn_skipLast": this.nestedPageIndex = (this.views[this.viewIndex].length - 1); break;

                    default: return;
                }

                // Update the message
                return await this.update();
            }
        });

        // When the collector times out remove the message's components
        collector.on("end", () => fetchedReply.edit({ components: [] }));
    }
}

/**
 * @param {{ ephemeral: false, followUp: false, timeout: 10000 }} options 
 */
async function message_paginationify(interaction, embeds, options) {
    options = { ephemeral: false, followUp: false, timeout: 10000, ...options };

    // Fail-safe if the the (embeds) parameter isn't an array
    if (!Array.isArray(embeds)) return;

    // Another check if the embed array ends up being empty
    if (embeds.length === 0) return;

    // If the {embeds} array is literally only 1 page long just send the embed without pagination
    if (embeds.length === 1)
        if (options.followUp)
            return await interaction.followUp({ embeds: [embeds[0]], ephemeral: options.ephemeral });
        else
            try { return await interaction.reply({ embeds: [embeds[0]], ephemeral: options.ephemeral }); }
            catch { return await interaction.editReply({ embeds: [embeds[0]], ephemeral: options.ephemeral }); }

    // Buttons
    let btn_skipToFirst = new ButtonBuilder().setLabel("◀◀").setStyle(ButtonStyle.Primary).setCustomId("btn_skipToFirst");
    let btn_back = new ButtonBuilder().setLabel("◀").setStyle(ButtonStyle.Primary).setCustomId("btn_back");
    let btn_jump = new ButtonBuilder().setLabel("📄").setStyle(ButtonStyle.Primary).setCustomId("btn_jump");
    let btn_next = new ButtonBuilder().setLabel("▶").setStyle(ButtonStyle.Primary).setCustomId("btn_next");
    let btn_skipToLast = new ButtonBuilder().setLabel("▶▶").setStyle(ButtonStyle.Primary).setCustomId("btn_skipToLast");

    // Action row
    let actionRow_pagination;

    // Only add the (btn_skipToFirst) and (btn_skipToLast) if there are more than 2 pages
    if (embeds.length > 2)
        actionRow_pagination = new ActionRowBuilder().addComponents(btn_skipToFirst, btn_back, btn_jump, btn_next, btn_skipToLast);
    else
        actionRow_pagination = new ActionRowBuilder().addComponents(btn_back, btn_next);

    // Send the first embed in the array and fetch the message after
    let fetchedReply;

    if (options.followUp)
        fetchedReply = await interaction.followUp({ embeds: [embeds[0]], components: [actionRow_pagination], ephemeral: options.ephemeral });
    else
        try {
            await interaction.reply({ embeds: [embeds[0]], components: [actionRow_pagination], ephemeral: options.ephemeral });
            fetchedReply = await interaction.fetchReply();
        } catch {
            // If you edit a reply you can't change the message to ephemeral unfortunately
            // unless you do a follow up message and then delete the original reply but that's pretty scuffed
            fetchedReply = await interaction.editReply({ embeds: [embeds[0]], components: [actionRow_pagination] });
        }

    // Keeps track of the current page the user's on
    let curPageIdx = 0;

    // Collect button interactions
    let filter = i => i.user.id === interaction.user.id;
    let collector = fetchedReply.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: options.timeout });
    collector.on("collect", async i => {
        // Defer the interaction and reset the collector's timer
        await i.deferUpdate();
        collector.resetTimer();

        // Execute action for whichever button was pressed
        switch (i.customId) {
            // Edit our message changing it to the 1st page in our (embeds) array
            case "btn_skipToFirst": curPageIdx = 0;
                return await fetchedReply.edit({ embeds: [embeds[curPageIdx]] });

            // Edit our message changing it to the page before the current page in our (embeds) array
            // skipping to the last page if the user pressed back on the 1st page
            case "btn_back": curPageIdx--;
                if (curPageIdx < 0) curPageIdx = embeds.length - 1;
                return await fetchedReply.edit({ embeds: [embeds[curPageIdx]] });

            // Edit our message changing it to the page the user picked in our (embeds) array
            case "btn_jump":
                // Let the user know what action they should take
                let _msg = await interaction.followUp({
                    content: `<@${interaction.member.id}> say the page number you want to jump to`
                });

                // Create a new message collector and await the user's next message
                let filter_temp = m => m.author.id === interaction.user.id;
                return interaction.channel.awaitMessages({ filter: filter_temp, time: 10000, max: 1 }).then(async collected => {
                    // Delete the user's number message along with our previous message telling the user what to do
                    collected.first().delete(); _msg.delete();

                    // Convert the collected message to a number
                    let pageNum = Number(collected.first().content);

                    // Check if the collected page number is actually a number, and that embed page is available
                    if (isNaN(pageNum) || pageNum > embeds.length || pageNum < 0)
                        // Send a self destructing message to the user stating that the given page number is invalid
                        return await message_deleteAfter(await interaction.followUp({
                            content: `<@${interaction.member.id}> that's an invalid page number`
                        }), 5000);

                    // Update the current page index
                    curPageIdx = pageNum - 1;

                    // Edit the embed to the new page index
                    return await fetchedReply.edit({ embeds: [embeds[curPageIdx]] });
                });

            // Edit our message changing it to the page after the current page in our (embeds) array
            // skipping to the 1st page if the user pressed next on the last page
            case "btn_next": curPageIdx++;
                if (curPageIdx > embeds.length - 1) curPageIdx = 0;
                return await fetchedReply.edit({ embeds: [embeds[curPageIdx]] });

            // Edit our message changing it to the last page in our (embeds) array
            case "btn_skipToLast": curPageIdx = embeds.length - 1;
                return await fetchedReply.edit({ embeds: [embeds[curPageIdx]] });
        }
    });

    // When the (collector) times out remove the reply's action row
    collector.on("end", i => fetchedReply.edit({ components: [] }));

    // Return (fetchedReply) because honestly, why not
    return fetchedReply;
}

async function message_deleteAfter(message, time) {
    let m;

    setTimeout(async () => m = await message.delete(), time);
    return m;
}

module.exports = {
    messageTools: {
        Embedinator: message_Embedinator,

        deleteAfter: message_deleteAfter,
        paginationify: message_paginationify
    }
};