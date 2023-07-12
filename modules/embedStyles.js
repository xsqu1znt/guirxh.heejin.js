const { EmbedBuilder, TimestampStyles, time } = require('discord.js');


const { communityServer, botSettings, userSettings } = require('../configs/heejinSettings.json');
const botConfig = require('../configs/config_bot.json');

const { arrayTools, stringTools, numberTools, dateTools } = require('../modules/jsTools');
const { markdown: { bold, inline, quote, link } } = require('./discordTools');
const { questManager } = require('../modules/mongo/index');
const { BetterEmbed } = require('../modules/discordTools');
const badgeManager = require('../modules/badgeManager');
const cardManager = require('../modules/cardManager');
const userParser = require('../modules/userParser');
// const shop = require('../modules/shop');
const itemPackManager = require('./itemPackManager');

// Gerald -> Error
/** @param {"itemNotFound"|"purchaseFailed"} errorType  */
async function generalError_ES(interaction, errorType, err = "") {
    let embed = new BetterEmbed({ interaction, description: err });

    switch (errorType) {
        case "itemNotFound": embed.setAuthor({ name: "⛔ Item not found" }); break;
        case "purchaseFailed": embed.setAuthor({ name: "⛔ Purchase failed" }); break;
        default: embed.setAuthor({ name: "⛔ An unknown error occured" }); break;
    }

    return await embed.send();
}

// General -> Quest Objective Completed
function quest_objectiveComplete_ES(guildMember, questProgress) {
    let objectives_f = questProgress.objectives_just_complete.map(obj =>
        `\`${questManager.toString.objective(obj)}\``
    );

    let date_end = dateTools.eta(Date.parse(questProgress.quest.date.end));

    let embed = new BetterEmbed({
        author: { text: `📜 Good job! %AUTHOR_NAME finished an objective!`, iconURL: null, user: guildMember },
        description: `>>> **${questProgress.quest.name}** :: ${objectives_f.join(" ")}\n\`📈 ${questProgress.f}\` :: ending ${date_end}`
    });

    return embed;
}

// Command -> General -> /COLLECTIONS
/** @param {"ascending" | "decending"} order */
function generalCollections_ES(guildMember, options = { order: "decending", filter: { group: "", category: "" } }) {
    let { cards_all } = cardManager;

    // Sort by set ID (decending order)
    cards_all = cards_all.sort((a, b) => a.setID - b.setID);
    if (options.order === "ascending") cards_all = cards_all.reverse();

    // Apply command filters
    // if (options.filter.group) cards_all = cards_all.filter(card => card.group.toLowerCase() === options.filter.group);
    if (options.filter.group) cards_all = cards_all.filter(card => card.group.toLowerCase().includes(options.filter.group));
    // if (options.filter.category) cards_all = cards_all.filter(card => card.category.toLowerCase() === options.filter.category);
    if (options.filter.category) cards_all = cards_all.filter(card => card.category.toLowerCase().includes(options.filter.category));

    // Create an array the only contains unique cards
    let cards_unique = arrayTools.unique(cards_all, "setID");

    // Get the number of cards in a set by using each unique card's set ID
    let card_totals = cards_unique.map(card => cards_all.filter(c => c.setID === card.setID).length);

    // Parse the card into a human readable format
    let collections_f = cards_unique.map((card, idx) => cardManager.toString.setEntry(card, card_totals[idx]));
    collections_f = arrayTools.chunk(collections_f, 10);

    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of collections_f) {
        // Create a new embed for this inventory page
        let embed_page = new BetterEmbed({
            author: { text: "%AUTHOR_NAME | collections", user: guildMember },
            description: group[0] ? group.join("\n") : "No collections found",
            footer: { text: `Page ${pageIndex++}/${collections_f.length || 1} • Total Sets: ${cards_unique.length}` }
        })

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the array of embeds
    return embeds;
}

// Command -> General -> /SHOP
function generalShop_ES(guildMember) {
    /// Parse cards
    /// Sort by global ID (ascending order)
    let _cards_shop_general = cardManager.cards_shop.general.sort((a, b) => a.globalID - b.globalID);
    let _cards_shop_special = cardManager.cards_shop.special.sort((a, b) => a.globalID - b.globalID);

    /// Iterate through each card and categorize them by setID
    let sets_card_general = cardManager.cards_shop.setIDs_general.map(setID =>
        _cards_shop_general.filter(card => card.setID === setID)
    );

    let sets_card_special = cardManager.cards_shop.setIDs_special.map(setID =>
        _cards_shop_special.filter(card => card.setID === setID)
    );

    /// Parse item packs
    // Sort by setID (ascending order)
    let _itemPacks = itemPackManager.itemPacks.sort((a, b) => a.setID - b.setID);

    // Iterate through each item pack and categorize them by setID
    let sets_itemPacks = itemPackManager.setIDs.map(setID => _itemPacks.filter(pack => pack.setID === setID));

    /// Parse badges
    // Sort by setID (ascending order)
    let _badges = badgeManager.badges.sort((a, b) => a.setID - b.setID);

    // Iterate through each item pack and categorize them by setID
    let sets_badges = badgeManager.setIDs.map(setID => _badges.filter(badge => badge.setID === setID));

    // Shop embed template
    let embed_shop_template = () => new BetterEmbed({
        author: { text: "%AUTHOR_NAME | shop", user: guildMember }
    });

    let embed_shopSets = () => {
        /// Format card sets into strings
        let sets_card_general_f = sets_card_general.map(set => cardManager.toString.setEntry(set[0], set.length, true));
        let sets_card_special_f = sets_card_special.map(set => cardManager.toString.setEntry(set[0], set.length, true));

        // Format item pack sets into strings
        let _itemPacks_f = sets_itemPacks.map(pack => itemPackManager.toString.setEntry(pack[0].setID));

        // Format badge sets into strings
        let _badges_f = sets_badges.map(badges => badgeManager.toString.setEntry(badges[0].setID));

        /// Dynamically create a string array with each available shop category  
        let shopSets_f = [];

        if (sets_card_general_f.length) shopSets_f.push({ name: "\`🃏\` Cards", value: sets_card_general_f.map(f => `> ${f}`).join("\n") });
        if (sets_card_special_f.length) shopSets_f.push({ name: "\`🎀\` Rewards", value: sets_card_special_f.map(f => `> ${f}`).join("\n") });

        if (_itemPacks_f.length) shopSets_f.push({ name: "\`📦\` Items", value: _itemPacks_f.map(f => `> ${f}`).join("\n") });

        if (_badges_f.length) shopSets_f.push({ name: "\`📛\` Badges", value: _badges_f.map(f => `> ${f}`).join("\n") });

        /// Create the shop embed
        let embed = embed_shop_template();
        shopSets_f.length ? embed.addFields(...shopSets_f) : embed.setDescription("The shop is empty right now");

        return embed;
    };

    let embed_allCards = () => {
        // Format cards into strings
        let sets_card_general_f = sets_card_general.map(set => set.map(card => cardManager.toString.shopEntry(card, "carrot")));

        /// Split up large card sets into chunks of 10
        let pages_cardsGeneral_f = [];

        for (let i = 0; i < sets_card_general_f.length; i++) if (sets_card_general_f[i].length > 10)
            // Chunk the array into groups of 10 and push each one to the final array
            arrayTools.chunk(sets_card_general_f[i], 10).forEach(chunk => pages_cardsGeneral_f.push(chunk));
        else
            // Push the group to the final array
            pages_cardsGeneral_f.push(sets_card_general_f[i]);

        /// Create the shop embeds
        let embeds = [];

        for (let i = 0; i < pages_cardsGeneral_f.length; i++) {
            // Create the shop page
            let embed = embed_shop_template()
                .setDescription(pages_cardsGeneral_f[i].join("\n") || "This page is empty")
                .setFooter({ text: `Page ${i + 1}/${pages_cardsGeneral_f.length || 1}` });

            // Check if this page includes custom cards
            if (embed.data.description.includes("cust")) embed.setDescription(
                `${link("*join our community to request a custom*", botConfig.community_server.INVITE_URL)}\n\n${embed.data.description}`
            );

            // Push the page embed to the embed array
            embeds.push(embed);
        }

        return embeds;
    };

    let embed_individualCardSets = () => {
        // Format cards into strings
        let sets_card_general_f = sets_card_general.map(set => set.map(card => cardManager.toString.shopEntry(card, "carrot")));

        /// Create the shop embed
        let embeds = [];

        for (let set_f of sets_card_general_f) {
            // Split up large card sets into chunks of 10
            let set_chunks_f = arrayTools.chunk(set_f, 10);

            /// Create the shop pages
            let _embeds = [];

            for (let i = 0; i < set_chunks_f.length; i++) {
                // Create the shop page
                let embed = embed_shop_template()
                    .setDescription(set_chunks_f[i].join("\n") || "This page is empty")
                    .setFooter({ text: `Page ${i + 1}/${set_chunks_f.length || 1}` });

                // Check if this page includes custom cards
                if (embed.data.description.includes("cust")) embed.setDescription(
                    `${link("*join our community to request a custom*", botConfig.community_server.INVITE_URL)}\n\n${embed.data.description}`
                );

                // Push the page embed to the embed array
                _embeds.push(embed);
            }

            embeds.push(_embeds);
        }

        return embeds;
    };

    let embed_allCards_special = () => {
        // Format cards into strings
        let sets_card_special_f = sets_card_special.map(set => set.map(card => cardManager.toString.shopEntry(card, "ribbon")));

        /// Split up large card sets into chunks of 10
        let pages_cardsSpecial_f = [];

        for (let i = 0; i < sets_card_special_f.length; i++) if (sets_card_special_f[i].length > 10)
            // Chunk the array into groups of 10 and push each one to the final array
            arrayTools.chunk(sets_card_special_f[i], 10).forEach(chunk => pages_cardsSpecial_f.push(chunk));
        else
            // Push the group to the final array
            pages_cardsSpecial_f.push(sets_card_special_f[i]);

        /// Create the shop embeds
        let embeds = [];

        for (let i = 0; i < pages_cardsSpecial_f.length; i++) {
            // Create the shop page
            let embed = embed_shop_template()
                .setDescription(pages_cardsSpecial_f[i].join("\n") || "This page is empty")
                .setFooter({ text: `Page ${i + 1}/${pages_cardsSpecial_f.length || 1}` });

            // Push the page embed to the embed array
            embeds.push(embed);
        }

        return embeds;
    };

    let embed_itemPacks = () => {
        // Format item packs into strings
        let sets_itemPacks_f = _itemPacks.map(item => itemPackManager.toString.shopEntry(item.id));

        // Split up large item pack sets into chunks of 10
        let pages_itemPacks_f = arrayTools.chunk(sets_itemPacks_f, 10);

        /// Create the shop embeds
        let embeds = [];

        for (let i = 0; i < pages_itemPacks_f.length; i++) {
            // Create the shop page
            let embed = embed_shop_template()
                .setDescription(pages_itemPacks_f[i].join("\n\n") || "This page is empty")
                .setFooter({ text: `Page ${i + 1}/${pages_itemPacks_f.length || 1}` });

            // Push the page embed to the embed array
            embeds.push(embed);
        }

        return embeds;
    };

    let embed_badges = () => {
        // Format cards into strings
        let sets_badges_f = _badges.map(badge => badgeManager.toString.shopEntry(badge));

        // Split up large card sets into chunks of 10
        let pages_badges_f = arrayTools.chunk(sets_badges_f, 10);

        /// Create the shop embeds
        let embeds = [];

        for (let i = 0; i < pages_badges_f.length; i++) {
            // Create the shop page
            let embed = embed_shop_template()
                .setDescription(pages_badges_f[i].join("\n") || "This page is empty")
                .setFooter({ text: `Page ${i + 1}/${pages_badges_f.length || 1}` });

            // Push the page embed to the embed array
            embeds.push(embed);
        }

        return embeds;
    };

    let shopPages = {
        shopSets: embed_shopSets(),
        allCards: embed_allCards(),
        individualCardSets: embed_individualCardSets(),
        allCards_special: embed_allCards_special(),
        itemPacks: embed_itemPacks(),
        badges: embed_badges()
    };

    let embeds_all = [
        shopPages.shopSets,
        shopPages.allCards,
        ...shopPages.individualCardSets,
        shopPages.allCards_special,
        shopPages.itemPacks,
        shopPages.badges
    ].filter(arr => arr?.length || arr);

    return {
        embeds: shopPages, embeds_all,
        selectMenu_cardSets_f: sets_card_general.map(set => ({
            emoji: set[0].emoji, name: stringTools.toTitleCase(set[0].group), description: stringTools.toTitleCase(set[0].group)
        }))
    };
}

// Command -> User -> /VIEW
/** @param {"uid" | "gid" | "set" | "idol" | "favorite" | "vault" | "team"} viewType */
function generalView_ES(guildMember, userData, card, viewType = "uid") {
    // A base embed template
    let embed_template = (title = "%AUTHOR_NAME | view", description = "", imageURL = "") => new BetterEmbed({
        author: { text: title || "%AUTHOR_NAME | view", user: guildMember },
        description, imageURL
    });

    let embed_viewUID = () => {
        // Whether or not this card is selected, favorited, or on the user's team
        let selected = (card.uid === userData.card_selected_uid);
        let favorited = (card.uid === userData.card_favorite_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let { duplicateCount } = userParser.cards.getDuplicates(userData, card.globalID);

        let card_f = cardManager.toString.inventory(card, { duplicateCount, selected, favorited, team });

        return embed_template(null, card_f, card.imageURL);
    };

    let embed_viewGID = () => {
        let card_f = cardManager.toString.inventory(card, { simplify: true });

        return embed_template(null, card_f, card.imageURL);
    };

    let embed_viewSet = () => {
        // Sort the cards by global ID and split it
        let _cards = card.sort((a, b) => a.globalID - b.globalID);

        /** @type {Array<BetterEmbed>} */
        let _embeds = [];

        _cards.forEach((_card, idx) => {
            let _card_f = cardManager.toString.inventory(_card, { simplify: true });

            // Create the embed
            let _embed = embed_template(`%AUTHOR_NAME | ${_card.group} - ${_card.single}`,
                _card_f, _card.imageURL
            ).setFooter({ text: `Card ${idx + 1}/${_cards.length}` });

            _embeds.push(_embed);
        });

        return _embeds;
    };

    let embed_viewIdol = () => {
        // Whether or not this card is favorited, or on the user's team
        let favorited = (card.uid === userData.card_favorite_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let card_f = cardManager.toString.inventory(card, { selected: true, favorited, team });

        return embed_template("%AUTHOR_NAME | idol", card_f, card.imageURL);
    };

    let embed_viewFavorite = () => {
        // Whether or not this card is selected, or on the user's team
        let selected = (card.uid === userData.card_selected_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let card_f = cardManager.toString.inventory(card, { selected, favorited: true, team });

        return embed_template("%AUTHOR_NAME | favorite", card_f, card.imageURL);
    };

    let embed_viewVault = () => {
        // Sort the cards by set ID and global ID, then group them by 10 per embed
        let _cards = arrayTools.chunk(card.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID), 10);

        /** @type {Array<BetterEmbed>} */
        let _embeds = [];

        _cards.forEach((_cardChunk, idx) => {
            // Parse each card into a string
            let _cardChunk_f = _cardChunk.map(_card => {
                // Whether or not this card is selected, favorited, or on the user's team
                let selected = (card.uid === userData.card_selected_uid);
                let favorited = (card.uid === userData.card_favorite_uid);
                let team = userData.card_team_uids.includes(card.uid);

                return cardManager.toString.inventory(_card, { selected, favorited, team });
            });

            // Create the embed
            let _embed = embed_template("%AUTHOR_NAME | vault", _cardChunk_f.join("\n"))
                .setFooter({ text: `Page ${idx + 1}/${_cards.length}` });

            _embeds.push(_embed);
        });

        return _embeds;
    };

    let embed_viewTeam = () => {
        //// Sort the cards by set ID and global ID, then group them by 10 per embed
        // let _cards = arrayTools.chunk(card.sort((a, b) => a.setID - b.setID || a.globalID - b.globalID), 10);
        let _cards = card;

        let abilityTotal = 0; _cards.forEach(card => abilityTotal += card.stats.ability);
        let reputationTotal = 0; _cards.forEach(card => reputationTotal += card.stats.reputation);

        /** @type {Array<BetterEmbed>} */
        let _embeds = [];

        _cards.forEach((_card, idx) => {
            // Parse the card into a string
            let _card_f = cardManager.toString.inventory(_card);

            // Create the embed
            let _embed = embed_template("%AUTHOR_NAME | team", _card_f, _card.imageURL).setFooter({
                text: `Card ${idx + 1}/${_cards.length} | Total :: ABI. %TOTAL_ABILITY / REP. %TOTAL_REPUTATION`
                    .replace("%TOTAL_ABILITY", abilityTotal)
                    .replace("%TOTAL_REPUTATION", reputationTotal)
            });

            _embeds.push(_embed);
        });

        return _embeds;
    };

    switch (viewType) {
        case "uid": return embed_viewUID();
        case "gid": return embed_viewGID();
        case "set": return embed_viewSet();
        case "idol": return embed_viewIdol();
        case "favorite": return embed_viewFavorite();
        case "vault": return embed_viewVault();
        case "team": return embed_viewTeam();
    }
}

// Command -> User -> /PROFILE
function userProfile_ES(guildMember, userData) {
    // Create a base embed
    let embed_template = () => new BetterEmbed({
        author: { text: "%AUTHOR_NAME | profile", user: guildMember }
    });

    let card_selected = userParser.cards.get(userData, userData.card_selected_uid);
    let card_favorite = userParser.cards.get(userData, userData.card_favorite_uid);

    let embed_main = () => {
        let _embed = embed_template();

        // Have the embed thumbnail the user's favorite card if they have one, or their pfp
        _embed.setThumbnail(card_favorite ? card_favorite.imageURL : guildMember.avatarURL({ dynamic: true }));

        // Add the user's profile biography if they have one
        if (userData.biography) _embed.addFields({ name: "\`👤\` Biography", value: userData.biography });

        // Add the user's basic information
        let uniqueUserCardTotal = arrayTools.unique(userData.card_inventory, "globalID").length;
        let profile_info = "%BALANCE :: %RIBBONS :: \`🃏 %CARD_TOTAL\` :: \`📈 LV. %LEVEL\`"
            .replace("%BALANCE", inline(botSettings.currencyIcon, userData.balance))
            .replace("%RIBBONS", inline("🎀", userData.ribbons || 0))
            .replace("%CARD_TOTAL", `${uniqueUserCardTotal}/${cardManager.cardCount}`)
            .replace("%LEVEL", userData.level);

        _embed.addFields([{ name: "\`📄\` Information", value: quote(profile_info) }]);

        // Return the embed
        return _embed;
    };

    let embed_badges = () => {
        let embed = embed_template();

        // Convert the BadgeLike objects to full badges
        let _badges = userData.badges.map(badge => badgeManager.parse.fromBadgeLike(badge));
        // let _badges_f = badges.map(badge => badgeManager.toString.profile(badge));

        let sets_badges = arrayTools.unique(_badges.map(badge => badge.setID))
            .map(setID => _badges.filter(badge => badge.setID === setID))
        
        let sets_badges_f = sets_badges.map(set => ({
            name: set[0].set, f: set.map(badge => `> ${badgeManager.toString.profile(badge.id)}`)
        }));

        // Have a max of 3 badges per line
        // _badges_f = arrayTools.chunk(_badges_f, 3);

        // Format the chunks into an array of strings
        // _badges_f = _badges_f.map(chunk_badges => chunk_badges.join("\n"));

        // Add the badges to the embed
        // embed.addFields([{ name: "\`📛\` Badges", value: badges_f.join("\n") }]);
        // _embed.setDescription(sets_badges_f.map(set => `***\"${set.name}\" set:***\n${set.join("\n")}`).join("\n\n"))
        embed.addFields(sets_badges_f.map(set => ({ name: `***\"${set.name}\" set:***`, value: set.f.join("\n") })));

        // Return the embed
        return embed;
    };

    let embed_card = (card) => {
        let _embed = embed_template();

        // Check if the card is favorited
        let isFavorite = (card.uid === card_favorite?.uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === card_selected?.uid);

        // Whether or not this is on the user's team
        let isOnTeam = (userData.card_team_uids.includes(card.uid));

        // Parse the card into a human readable string
        let card_f = cardManager.toString.inventory(card, {
            favorited: isFavorite,
            selected: isSelected,
            team: isOnTeam
        });

        // Add the card's information to the embed
        _embed.setDescription(card_f);

        // Add the card's image to the embed if available
        if (card.imageURL) _embed.setImage(card.imageURL);

        // Return the embed
        return _embed;
    };

    let embed_inventoryStats = () => {
        let _embed = embed_template();

        // Get an array of each card category
        let allCards = Object.values(cardManager.cards);

        // Get the name of each card category
        // TODO: separate each event
        let categories = Object.keys(cardManager.cards);

        // Parse the user's card_inventory into fully detailed cards
        userData.card_inventory = userData.card_inventory.map(card => cardManager.parse.fromCardLike(card));

        // Create an array of the user's cards sorted by category
        let userCards = allCards.map(category => {
            // Get each unique card rarity from the current category
            let rarities = arrayTools.unique(category, "rarity").map(card => card.rarity);

            // Create an array of every card that matches that category
            let userCards_categoryGroup = userData.card_inventory.filter(card => rarities.includes(card.rarity));

            // Filter out non-unique cards
            if (userCards_categoryGroup.length > 0)
                userCards_categoryGroup = arrayTools.unique(userCards_categoryGroup, "globalID");

            // Return an array of unique user cards that match the category
            return userCards_categoryGroup;
        });

        // Parse the sorted user cards into a readable string
        let inventoryStats_f = userCards.map((category, idx) => quote("%CATEGORY: %STATS"
            .replace("%CATEGORY", bold("🃏", categories[idx]))
            .replace("%STATS", inline(`${category.length}/${allCards[idx].length}`))
        ));

        // Set the embed's description to the inventory stat result
        // _embed.setDescription(inventoryStats_f.join("\n"));

        _embed.addFields(
            { name: "\`🌕\` Normal Sets", value: inventoryStats_f.slice(0, 5).join("\n"), inline: true },
            { name: "\`🌗\` Special Sets", value: inventoryStats_f.slice(5).join("\n"), inline: true }
        );

        // Return the embed
        return _embed;
    };

    // Create the dynamic profile pages
    let embeds = [embed_main()];

    // Add the badge page if the user has badges
    if (userData.badges.length > 0) embeds.push(embed_badges());

    // Add the idol card page if the user has a selected idol
    if (card_selected) embeds.push(embed_card(card_selected));
    // Add the favorite card page if the user has a favorite card
    if (card_favorite) embeds.push(embed_card(card_favorite));

    // This page will always be the last
    embeds.push(embed_inventoryStats());

    // Return the embed pages
    return {
        embeds,

        pageExists: {
            badges: (userData.badges.length > 0),
            idol: card_selected ? true : false,
            favorite: card_favorite ? true : false
        }
    };
}

// Command -> User -> /MISSING
function userMissing_ES(guildMember, userData, setID) {
    // Create a base embed
    let embed_template = (description = "", footer_text = "") => new BetterEmbed({
        author: { text: "%AUTHOR_NAME | missing", user: guildMember },
        description: description || `\`${setID}\` is either empty or an invalid set.`,
        footer: { text: footer_text || null }
    });

    // Get every card in the set
    let cards_set = cardManager.cards_all.filter(card => card.setID === setID);
    if (cards_set.length === 0) return [embed_template()];

    // Sort by set ID (decending order)
    cards_set = cards_set.sort((a, b) => a.globalID - b.globalID);

    // Parse cards_set into an array of human readable strings
    let cards_set_f = cards_set.map(card => {
        let isMissing = userData.card_inventory.find(c => c.globalID === card.globalID) ? false : true;
        return cardManager.toString.missingEntry(card, isMissing);
    });

    // Break up cards into multiple pages to retain there being a max of 10 cards per page
    cards_set_f = arrayTools.chunk(cards_set_f, 10);

    // Create the embeds
    let embeds = [];
    for (let i = 0; i < cards_set_f.length; i++) {
        // Create the embed page
        embeds.push(embed_template(cards_set_f[i].join("\n"), `Page ${i + 1}/${cards_set_f.length || 1}`));
    }

    return embeds;
}

// Command -> User -> /COOLDOWNS
function userCooldowns_ES(guildMember, userData) {
    let cooldownTypes = Object.entries(userSettings.cooldowns).filter(([type, time]) => time !== null);
    let cooldowns = cooldownTypes.map(([type, time]) => ({ type, timestamp: 0 }));

    let cooldowns_user = userData.cooldowns;

    cooldowns_user.forEach(cooldown => {
        let spliceIndex = cooldowns.findIndex(c => c.type === cooldown.type);
        if (spliceIndex >= 0) cooldowns.splice(spliceIndex, 1, cooldown);
    });

    let cooldowns_f = cooldowns.map(cooldown => {
        let cooldownETA = dateTools.eta(cooldown.timestamp, true);

        return "\`%VISUAL %NAME:\` %AVAILABILITY"
            .replace("%VISUAL", cooldownETA ? "❌" : "✔️")
            .replace("%NAME", stringTools.toTitleCase(cooldown.type.replace(/_/g, " ")))
            .replace("%AVAILABILITY", bold(cooldownETA
                ? `<t:${numberTools.milliToSeconds(cooldown.timestamp)}:${TimestampStyles.RelativeTime}>`
                : "Available"));
    });

    let embed_cooldowns = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | cooldowns", user: guildMember },
        description: cooldowns_f.join("\n")
    });

    return embed_cooldowns;
}

// Command -> User -> /INVENTORY
class uinv_filter {
    constructor() {
        this.setID = "";
        this.group = "";
        this.name = "";

        /** @type {"set" | "global"} */
        this.sorting = "set";
        /** @type {"ascending" | "descending"} */
        this.order = "ascending";
    }
}

/** @param {uinv_filter} filter */
function userInventory_ES(guildMember, userData, filter) {
    filter = { ...new uinv_filter(), ...filter }; userParser.cards.parseInventory(userData);

    // Apply card filters
    let cards = userParser.cards.getInventory(userData);
    let isFiltered = false;

    if (filter.setID) { cards = cards.filter(c => c.card.setID === filter.setID); isFiltered = true; }
    if (filter.group) { cards = cards.filter(c => c.card.group.toLowerCase().includes(filter.group)); isFiltered = true; }
    if (filter.name) { cards = cards.filter(c => c.card.name.toLowerCase().includes(filter.name)); isFiltered = true; }

    // Sort the cards
    switch (filter.sorting) {
        case "set": cards.sort((a, b) => a.card.setID - b.card.setID || a.card.globalID - b.card.globalID); break;

        case "global": cards.sort((a, b) => a.card.globalID - b.card.globalID); break;
    }

    if (filter.order === "descending") cards.reverse();

    /// Create the the inventory pages
    if (!cards.length) return [
        new BetterEmbed({
            author: { text: "%AUTHOR_NAME | inventory", user: guildMember },
            description: isFiltered
                ? "No cards were found with that search filter"
                : "You do not have anything in your inventory\n> Use \`/drop\` to get cards"
        })
    ];

    let cards_f = arrayTools.chunk(cards.map(card => card.card_f), 10);

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < cards_f.length; i++) {
        let _embed = new BetterEmbed({
            author: { text: "%AUTHOR_NAME | inventory", user: guildMember },
            description: cards_f[i].join("\n"),
            footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.length}` }
        }); embeds.push(_embed);
    }

    // Return the embed array
    return embeds;
}

// Command -> User -> /INVENTORY DUPES:
function userInventory_dupes_ES(guildMember, userData, globalID) {
    // Filter only cards matching the given global ID
    let cards = userParser.cards.getDuplicates(userData, globalID);
    if (cards.all.length <= 1) return [
        new BetterEmbed({
            author: { text: "%AUTHOR_NAME | dupes", user: guildMember },
            description: "No duplicates of that card were found"
        })
    ];

    let cards_f = arrayTools.chunk(cards.all.map(card => {
        // Whether or not this is the user's favorited card
        let _isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let _isSelected = (card.uid === userData.card_selected_uid);

        // Whether or not this is on the user's team
        let _isOnTeam = (userData.card_team_uids.includes(card.uid));

        return cardManager.toString.inventory(card, {
            favorited: _isFavorite, selected: _isSelected, team: _isOnTeam
        });
    }), 10);

    /// Create the the inventory pages
    let embeds = [];

    for (let i = 0; i < cards_f.length; i++) {
        let _embed = new BetterEmbed({
            author: { text: "%AUTHOR_NAME | dupes", user: guildMember },
            description: cards_f[i].join("\n"),
            footer: { text: `Page ${i + 1}/${cards_f.length || 1} | Total: ${cards.all.length}` }
        }).setThumbnail(cards.primary.imageURL); embeds.push(_embed);
    }

    // Return the embed array
    return embeds;
}

// Command -> User -> /GIFT
function userGift_ES(guildMember, recipient, cards) {
    if (!Array.isArray(cards)) cards = [cards];

    // Get the last card to show its image
    let cards_f = cards.map(card => cardManager.toString.inventory(card));
    let card_last = cards.slice(-1)[0] || cards[0];

    // Create the gift embed
    let fromTo = `**From:** ${guildMember}\n**To:** ${recipient}`;

    let embed_gift = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | gift", user: guildMember },
        description: `${cards_f.join("\n")}\n${fromTo}`,
        imageURL: card_last.imageURL
    });

    // Create the DM embed
    let embed_dm = new BetterEmbed({
        title: { text: "\`📬\` You have a message!" },
        description: `You got a gift from **${guildMember.user.username}**\n${cards_f.join("\n")}`,
        imageURL: card_last.imageURL,
        showTimestamp: true
    });

    // Return the embeds
    return { embed_gift, embed_dm };
}

// Command -> User -> /QUEST
async function userQuest_ES(guildMember) {
    // Fetch the user's QuestCache
    let questCache = await questManager.cache.fetch(guildMember.id);
    let questProgress_f = [];

    for (let quest of questManager.quests) {
        // Get the user's quest progress if available
        let questProgress = questCache?.progress?.find(q => q.questID === quest.id);

        // Check if the quest is complete
        let isComplete = questProgress?.complete !== undefined
            ? questProgress.complete : questManager.user.isComplete(guildMember.id, quest.id);

        /// Parse quest objectives into an array
        let quest_objectives = Object.keys(quest.objectives);

        let quest_objectiveProgress = questProgress?.objectives
            ? Object.values(questProgress.objectives) : [...Array(quest_objectives.length)].fill(isComplete);

        // Parse quest/quest progress data into a readable string
        questProgress_f.push({
            name: "\`📜\` **%QUEST_NAME** :: ending %QUEST_ENDING"
                .replace("%QUEST_NAME", quest.name)
                .replace("%QUEST_ENDING", dateTools.eta(Date.parse(quest.date.end))),

            value: "\`%IS_COMPLETE\` \`📈 %PROGRESS objectives\`\n> *Rewards* :: %REWARD_OVERVIEW\n\n***objectives:***\n%OBJECTIVES\n%DESCRIPTION"
                .replace("%IS_COMPLETE", isComplete ? "✔️ complete" : "🚫 incomplete")
                .replace("%PROGRESS", questProgress?.f || (isComplete ? `${quest_objectives.length}/${quest_objectives.length}` : "n\a"))

                .replace("%REWARD_OVERVIEW", quest.reward_overview)

                .replace("%OBJECTIVES", quest_objectives
                    .map((obj, idx) => `> \`${quest_objectiveProgress[idx] ? "✔️" : "🚫"}\` ${questManager.toString.objectiveDescription(quest.id, obj)}`)
                    .join("\n"))

                .replace("%DESCRIPTION", quest.description ? `> ${quest.description}` : ""),

            inline: true
        });
    }

    let embed = new BetterEmbed({
        author: { text: "%AUTHOR_NAME | quest", user: guildMember },
        description: questProgress_f.length ? "" : "There are no quests right now"
    });

    embed.addFields(questProgress_f);

    return embed;
}

module.exports = {
    // General Embeds
    generalError_ES,
    quest_objectiveComplete_ES,

    // General Commands
    generalCollections_ES,
    generalShop_ES,
    generalView_ES,

    // User Commands
    userProfile_ES,
    userMissing_ES,
    userCooldowns_ES,

    userInventory_ES,
    userInventory_dupes_ES,

    userGift_ES,
    userQuest_ES
};