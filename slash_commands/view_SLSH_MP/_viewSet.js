const { Client, CommandInteraction } = require('discord.js');

const { botSettings } = require('../../configs/heejinSettings.json');
const { generalSetView_ES } = require('../../modules/embedStyles');
const { BetterEmbed, messageTools } = require('../../modules/discordTools');
const { dateTools } = require('../../modules/jsTools');
const { userManager } = require('../../modules/mongo');
const cardManager = require('../../modules/cardManager');
const userParser = require('../../modules/userParser');

module.exports = {
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {BetterEmbed} baseEmbed
     */
    execute: async (client, interaction, baseEmbed) => {
        // Interaction options
        let uid = interaction.options.getString("uid");
        let globalID = interaction.options.getString("gid");
        let setID = interaction.options.getString("setid");

        if (uid) {
            let userData = await userManager.fetch(interaction.user.id, "cards", true);
            let _card = userParser.cards.get(userData.card_inventory, uid); if (!_card)
                return await baseEmbed.send({ description: `\`${uid}\` is an invalid unique ID` });

            setID = cardManager.parse.fromCardLike(_card).setID;
        } else if (globalID) {
            let _card = cardManager.get.byGlobalID(globalID); if (!_card)
                return await baseEmbed.send({ description: `\`${globalID}\` is an invalid card ID` });

            setID = _card.setID;
        }

        // Get the card set from our collection
        let cards = cardManager.get.set(setID); if (!cards.length)
            return await baseEmbed.send({ description: `\`${setID}\` is an invalid set ID` });

        // Create the view embed
        let embeds_card = generalSetView_ES(interaction.user, cards, setID);

        // Navigateinator-ify-er 9000!!!!11
        return await new messageTools.Navigationify(interaction, [embeds_card], {
            timeout: dateTools.parseStr(botSettings.timeout.pagination),
            pagination: true
        }).send();
    }
};