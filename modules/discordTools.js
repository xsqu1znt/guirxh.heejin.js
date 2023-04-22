const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { botSettings } = require('../configs/heejinSettings.json');

// Message Tools
async function message_deleteAfter(message, time) {
    let m;

    setTimeout(async () => m = await message.delete(), time);
    return m;
}

/** Create a simple embed with a description. */
class message_Embedinator {
    constructor(interaction, options = { title: "", author: null }) {
        options = { title: "", author: null, ...options };

        this.interaction = interaction;
        this.title = options.title
            .replace("%USER", options.author.username || interaction.user.username);
        this.author = options.author;
    }

    /** Change the title.
     * @param {string} title The title.
     */
    setTitle(title) { this.title = title; }
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
                    content: `<@${interaction.member.id}> say the page number you wish to jump to.`
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
                            content: `<@${interaction.member.id}> that is an invalid page number.`
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

module.exports = {
    messageTools: {
        deleteAfter: message_deleteAfter,

        Embedinator: message_Embedinator,
        paginationify: message_paginationify
    }
};