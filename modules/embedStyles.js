const { EmbedBuilder, TimestampStyles } = require('discord.js');

const { markdown: { bold, inline, quote } } = require('./discordTools');

const { communityServer, botSettings, userSettings } = require('../configs/heejinSettings.json');
const { arrayTools, stringTools, numberTools, dateTools } = require('../modules/jsTools');
const { BetterEmbed, messageTools } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');
const badgeManager = require('../modules/badgeManager');
const userParser = require('../modules/userParser');
const shop = require('../modules/shop');

// Command -> General -> /COLLECTIONS
/** @param {"ascending" | "decending"} order */
function generalCollections_ES(user, options = { order: "decending", filter: { group: "", category: "" } }) {
    let { cards_all } = cardManager;

    // Sort by set ID (decending order)
    cards_all = cards_all.sort((a, b) => a.setID - b.setID);
    if (options.order === "ascending") cards_all = cards_all.reverse();

    // Apply command filters
    if (options.filter.group) cards_all = cards_all.filter(card => card.group.toLowerCase() === options.filter.group);
    if (options.filter.category) cards_all = cards_all.filter(card => card.category.toLowerCase() === options.filter.category);

    // Create an array the only contains unique cards
    let cards_unique = arrayTools.unique(cards_all, (card, card_compare) => card.setID === card_compare.setID);

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
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | collections`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "No collections found")
            .setFooter({ text: `Page ${pageIndex++}/${collections_f.length || 1} • Total Sets: ${cards_unique.length}` })
            .setColor(botSettings.embed.color || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the array of embeds
    return embeds;
}

// Command -> General -> /SHOP
function generalShop_ES(user) {
    let { cards_shop } = cardManager;

    // Sort by global ID (decending order)
    cards_shop = cards_shop.sort((a, b) => a.globalID - b.globalID);

    // Create an array of only unique shop cards for sorting purposes
    let cards_shop_unique = arrayTools.unique(cards_shop, (card, cardCompare) => card.setID === cardCompare.setID);
    // The amount of cards in each set
    let card_sets = cards_shop_unique.map(card => cards_shop.filter(c => c.setID === card.setID));

    // Embed creation
    let embed_template = () => new EmbedBuilder()
        .setAuthor({ name: `${user.username} | shop`, iconURL: user.avatarURL({ dynamic: true }) })
        .setColor(botSettings.embed.color || null);

    let embed_list = () => {
        let cards_f = cards_shop_unique.map((card, idx) => cardManager.toString.setEntry(card, card_sets[idx].length, true));

        // Badges
        let uniqueSet_badges = arrayTools.unique(shop.badges.all.sort((a, b) => a.setID - b.setID),
            (badge, badgeCompare) => badgeCompare.setID === badge.setID
        );

        let sets_badges = uniqueSet_badges.map(badge => shop.badges.all.filter(b => b.setID === badge.setID));
        let badges_f = uniqueSet_badges.map((badge, idx) =>
            shop.badges.toString.setEntry(badge, sets_badges[idx].length)
        );

        // Item packs
        let uniqueSet_itemPacks = arrayTools.unique(shop.itemPacks.all.sort((a, b) => a.setID - b.setID),
            (pack, packCompare) => packCompare.setID === pack.setID
        );

        let sets_itemPacks = uniqueSet_itemPacks.map(pack => shop.itemPacks.all.filter(p => p.setID === pack.setID));
        let itemPacks_f = uniqueSet_itemPacks.map((pack, idx) =>
            shop.itemPacks.toString.setEntry(pack, sets_itemPacks[idx].length)
        );

        let shop_f = "";
        shop_f += cards_f.length ? `\`🃏\` **Cards**\n${cards_f.map(card_f => `> ${card_f}`).join("\n")}` : "";
        shop_f += badges_f.length ? `\n\n\`📛\` **Badges**\n${badges_f.map(badge_f => `> ${badge_f}`).join("\n")}` : "";
        shop_f += itemPacks_f.length ? `\n\n\`📦\` **Items**\n${itemPacks_f.map(pack_f => `> ${pack_f}`).join("\n")}` : "";

        // Create the embed
        let embed = embed_template()
            .setDescription(shop_f || "Shop is empty!");

        // Return the embed
        return embed;
    };

    let embed_all = () => {
        let cardSets_f = card_sets.map(set => set.map(card => cardManager.toString.shopEntry(card)));

        // Break up sets into multiple pages to retain there being a max of 10 sets per page
        cardSets_f = (() => {
            let newArr = [];

            for (let set of cardSets_f) {
                if (set.length > 10) newArr = [...newArr, ...arrayTools.chunk(set, 10)];
                else newArr = [...newArr, set];
            };

            return newArr;
        })();

        let embeds = [];

        for (let i = 0; i < cardSets_f.length; i++) {
            let cardEntries = cardSets_f[i].join("\n");

            // Create the embed page
            let embed = embed_template()
                .setDescription(cardEntries)
                .setFooter({ text: `Page ${i + 1}/${cardSets_f.length || 1}` });

            // Let the user know how to request customs
            if (cardEntries.includes("cust"))
                embed.setDescription(`[join our server to request your custom](${communityServer.url})\n\n${cardEntries}`);

            embeds.push(embed);
        }

        return embeds;
    };

    let embed_cardSets = () => {
        let embeds = [];

        for (let card of cards_shop_unique) {
            let cardSet = cards_shop.filter(c => c.setID === card.setID);
            let cardSet_f = cardSet.map(c => cardManager.toString.shopEntry(c));

            cardSet_f = arrayTools.chunk(cardSet_f, 10);

            let _embeds = [];
            for (let i = 0; i < cardSet_f.length; i++) {
                let cardEntries = cardSet_f[i].join("\n");

                let embed = embed_template()
                    .setDescription(cardEntries)
                    .setFooter({ text: `Page ${i + 1}/${cardSet_f.length || 1}` });

                // Let the user know how to request customs
                if (cardEntries.includes("cust"))
                    embed.setDescription(`[join our server to request your custom](${communityServer.url})\n\n${cardEntries}`);

                _embeds.push(embed);
            }

            embeds.push(_embeds);
        }

        return embeds;
    };

    let embed_itemPacks = () => {
        let itemPacks_f = shop.itemPacks.all.map(cardPack => shop.itemPacks.toString.shop(cardPack));
        itemPacks_f = arrayTools.chunk(itemPacks_f, 10);

        let embeds = [];

        for (let i = 0; i < itemPacks_f.length; i++) {
            let embed = embed_template()
                .setDescription(itemPacks_f[i].length > 0 ? itemPacks_f[i].join("\n") : "There are no item packs available");

            if (itemPacks_f[i].length > 0) embed.setFooter({ text: `Page ${i + 1}/${itemPacks_f.length || 1}` });

            embeds.push(embed);
        }

        return embeds;
    };

    let embed_badges = () => {
        let badges_f = badgeManager.badges.map(badge => badgeManager.toString.shop(badge));
        badges_f = arrayTools.chunk(badges_f, 10);

        let embeds = [];

        for (let i = 0; i < badges_f.length; i++) {
            let embed = embed_template()
                .setDescription(badges_f[i].length > 0 ? badges_f[i].join("\n") : "There are no badges available");

            if (badges_f[i].length > 0) embed.setFooter({ text: `Page ${i + 1}/${badges_f.length || 1}` });

            embeds.push(embed);
        }

        return embeds;
    };

    // Return the different embed views
    return [
        embed_list(),
        embed_all(),
        ...embed_cardSets(),
        embed_itemPacks(),
        embed_badges()
    ];
}

// Command -> General -> /view card:set
function generalSetView_ES(user, cards) {
    cards = cards.sort((a, b) => a.globalID - b.globalID);

    let embed_template = (titleAddon = "", text = "", imageURL = "") => new BetterEmbed({
        author: { text: `%AUTHOR_NAME | ${titleAddon}`, user },
        description: text || "There are no cards in this set", imageURL
    });

    let embeds = [];
    for (let i = 0; i < cards.length; i++) {
        let card_f = cardManager.toString.inventory(cards[i], { simplify: true });
        let _embed = embed_template(
            `${cards[i].group} - ${cards[i].single}`,
            card_f, cards[i].imageURL
        ).setFooter({ text: `Card ${i + 1}/${cards.length}` });

        embeds.push(_embed);
    }

    return embeds.length ? embeds : [embed_template()];
}

// Command -> User -> /VIEW UID | /VIEW GID | /VIEW FAVORITE
/** @param {"uid" | "gid" | "set" | "favorite" | "idol" | "team"} viewType */
function generalView_ES(member, userData, card, viewType = "uid") {
    // A base embed template
    let embed_template = (title = "%AUTHOR_NAME | view", description = "", imageURL = "") => new BetterEmbed({
        author: { text: title || "%AUTHOR_NAME | view", user: member },
        description, imageURL
    });

    let embed_viewUID = () => {
        // Whether or not this card is selected, favorited, or on the user's team
        let selected = (card.uid === userData.card_selected_uid);
        let favorited = (card.uid === userData.card_favorite_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let { duplicateCount } = userParser.cards.getDuplicates(userData, card.globalID);

        let card_f = cardManager.toString.inventory(card, { duplicateCount, selected, favorited, team });

        return embed_template(null, card_f, card.imageURL).setFooter({ text: card.description });
    };

    let embed_viewGID = () => {
        let card_f = cardManager.toString.inventory(card, { simplify: true });

        return embed_template(null, card_f, card.imageURL).setFooter({ text: card.description });
    };

    let embed_viewSet = () => {
        // Sort the cards by global ID and split it
        let _cards = card.sort((a, b) => a.globalID - b.globalID);

        /** @type {Array<BetterEmbed>} */
        let _embeds = [];
        _cards.forEach((_card, idx) => {
            let _card_f = cardManager.toString.inventory(_card, { simplify: true });

            let _embed = embed_template(
                `%AUTHOR_NAME | ${_card.group} - ${_card.single}`,
                _card_f, _card.imageURL
            ).setFooter({ text: `Card ${idx + 1}/${_cards.length} :: ${_card.description}` });

            _embeds.push(_embed);
        });

        return _embeds;
    };

    let embed_viewFavorite = () => {
        // Whether or not this card is selected, or on the user's team
        let selected = (card.uid === userData.card_selected_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let card_f = cardManager.toString.inventory(card, { selected, favorited: true, team });

        return embed_template("%AUTHOR_NAME | favorite", card_f, card.imageURL).setFooter({ text: card.description });
    };

    let embed_viewIdol = () => {
        // Whether or not this card is favorited, or on the user's team
        let favorited = (card.uid === userData.card_favorite_uid);
        let team = userData.card_team_uids.includes(card.uid);

        let card_f = cardManager.toString.inventory(card, { selected: true, favorited, team });

        return embed_template("%AUTHOR_NAME | idol", card_f, card.imageURL).setFooter({ text: card.description });
    };

    let embed_viewTeam = () => {

    };

    switch (viewType) {
        case "uid": return embed_viewUID();
        case "gid": return embed_viewGID();
        case "set": return embed_viewSet();
        case "favorite": return embed_viewFavorite();
        case "idol": return embed_viewIdol();
        case "team": return embed_viewTeam();
    }
}

// Command -> User -> /DROP
function userDrop_ES(user, cards, cards_isDuplicate, dropTitle = "drop") {
    if (!Array.isArray(cards)) cards = [cards];
    if (!Array.isArray(cards_isDuplicate)) cards_isDuplicate = [cards_isDuplicate];

    let emoji_numbers = botSettings.customEmojis.numbers;

    let cards_f = cards.map((card, idx) => "%IDX%CARD"
        .replace("%IDX", cards.length > 1 ? `${emoji_numbers[idx].emoji} ` : "")
        .replace("%CARD", cardManager.toString.inventory(card, {
            isDuplicate: cards_isDuplicate[idx] || false,
            simplify: true
        }))
    );

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cards_f.join("\n"))
        .setColor(botSettings.embed.color || null);

    let card_last = cards.slice(-1)[0];
    if (card_last.imageURL) embed.setImage(card_last.imageURL);

    // Let the user know they can sell the card by reacting
    embed.setFooter({
        text: cards.length > 1
            ? "React with any number and confirm to sell"
            : "React to sell this card",
        iconURL: "https://cdn.discordapp.com/attachments/1014199645750186044/1104414979798618243/carrot.png"
    });

    return embed;
}

// Command -> User -> /PROFILE
function userProfile_ES(user, userData) {
    // Create a base embed
    let embed_template = () => new messageTools.Embedinator(null, {
        title: "%USER | profile", author: user
    }).embed;

    let card_selected = userParser.cards.get(userData.card_inventory, userData.card_selected_uid);
    let card_favorite = userParser.cards.get(userData.card_inventory, userData.card_favorite_uid);

    let embed_main = () => {
        let _embed = embed_template();

        // Have the embed thumbnail the user's favorite card if they have one, or their pfp
        _embed.setThumbnail(card_favorite ? card_favorite.imageURL : user.avatarURL({ dynamic: true }));

        // Add the user's profile biography if they have one
        if (userData.biography) _embed.addFields({ name: "\`👤\` Biography", value: userData.biography });

        // Add the user's basic information
        let uniqueUserCardTotal = arrayTools.unique(userData.card_inventory,
            (card, compareCard) => card.globalID === compareCard.globalID
        ).length;
        let profile_info = "%BALANCE :: \`🃏 %CARD_TOTAL\` :: \`📈 LV. %LEVEL\`"
            .replace("%BALANCE", inline(botSettings.currencyIcon, userData.balance))
            .replace("%CARD_TOTAL", `${uniqueUserCardTotal}/${cardManager.cardCount}`)
            .replace("%LEVEL", userData.level);

        _embed.addFields([{ name: "\`📄\` Information", value: quote(profile_info) }]);

        // Return the embed
        return _embed;
    };

    let embed_badges = () => {
        let _embed = embed_template();

        // Convert the BadgeLike objects to full badges
        let badges = userData.badges.map(badge => badgeManager.parse.fromBadgeLike(badge));
        let badges_f = badges.map(badge => badgeManager.toString.profile(badge));

        // Have a max of 3 badges per line
        badges_f = arrayTools.chunk(badges_f, 3);

        // Format the chunks into an array of strings
        badges_f = badges_f.map(chunk_badges => quote(chunk_badges.join(" ")));

        // Add the badges to the embed
        // embed.addFields([{ name: "\`📛\` Badges", value: badges_f.join("\n") }]);
        _embed.setDescription(badges_f.join("\n"))

        // Return the embed
        return _embed;
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
            let rarities = arrayTools.unique(category, (card, cardCompare) => card.rarity === cardCompare.rarity)
                .map(card => card.rarity);

            // Create an array of every card that matches that category
            let userCards_categoryGroup = userData.card_inventory.filter(card => rarities.includes(card.rarity));

            // Filter out non-unique cards
            if (userCards_categoryGroup.length > 0) userCards_categoryGroup = arrayTools.unique(userCards_categoryGroup,
                (card, cardCompare) => card.globalID === cardCompare.globalID
            );

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
            { name: "\`🌗\` Special Sets 1", value: inventoryStats_f.slice(5).join("\n"), inline: true }
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
function userMissing_ES(user, userData, setID) {
    // Create a base embed
    let embed_template = () => new messageTools.Embedinator(null, {
        title: "%USER | missing",
        description: `${inline(setID)} is either empty or an invalid set.`,
        author: user
    }).embed;

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
        let embed = embed_template()
            .setDescription(cards_set_f[i].join("\n"))
            .setFooter({ text: `Page ${i + 1}/${cards_set_f.length || 1}` });

        embeds.push(embed);
    }

    return embeds;
}

// Command -> User -> /COOLDOWNS
function userCooldowns_ES(user, userData) {
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

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | cooldowns`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cooldowns_f.join("\n"))
        .setColor(botSettings.embed.color || null);

    return embed;
}

// Command -> User -> /INVENTORY
/**
 * @param {"global" | "set"} sorting
 * @param {"ascending" | "descending"} order
 */
function userInventory_ES(user, userData, sorting = "set", order = "descending", filter = { setID: "", groupName: "" }) {
    filter = { setID: "", group: "", ...filter };
    sorting ||= "set"; order ||= "descending";

    // Parse the CardLike objects into fully detailed cards
    let cards_user = userData.card_inventory.map(card => cardManager.parse.fromCardLike(card));

    // Filter the cards
    if (filter.setID) cards_user = cards_user.filter(card => card.setID === filter.setID);
    if (filter.groupName) cards_user = cards_user.filter(card => card.group.toLowerCase() === filter.groupName);

    // Sort the cards
    switch (sorting) {
        case "global": cards_user = cards_user.sort((a, b) => a.globalID - b.globalID); break;
        case "set": cards_user = cards_user.sort((a, b) => a.setID - b.setID); break;
    }

    if (order === "ascending") cards_user = cards_user.reverse();

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let cards_user_f = [];

    let cards_user_primary = userParser.cards.primary(cards_user);
    for (let card of cards_user_primary) {
        // Get the duplicate cards under the primary card
        let { card_duplicates } = userParser.cards.duplicates(cards_user, { globalID: card.globalID });

        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === userData.card_selected_uid);

        // Whether or not this is on the user's team
        let isOnTeam = (userData.card_team_uids.includes(card.uid));

        cards_user_f.push(cardManager.toString.inventory(card, {
            duplicateCount: card_duplicates.length,
            favorited: isFavorite,
            selected: isSelected,
            team: isOnTeam
        }));
    }

    // Max of 10 entires per page
    cards_user_f = arrayTools.chunk(cards_user_f, 10);
    // Create an array to store the inventory pages for easy pagination
    let embeds = [];

    // Keep track of the page index
    let pageIndex = 1;

    // Go through each group in (cards_f) and create an embed for it
    for (let group of cards_user_f) {
        // Create a new embed for this inventory page
        let embed_page = new EmbedBuilder()
            .setAuthor({ name: `${user.username} | inventory`, iconURL: user.avatarURL({ dynamic: true }) })
            .setDescription(group[0] ? group.join("\n") : "try doing \`/drop\` to start filling up your inventory!")
            .setFooter({ text: `Page ${pageIndex++}/${cards_user_f.length || 1} | Total: ${cards_user_primary.length}` })
            .setColor(botSettings.embed.color || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the embed array
    return embeds;
}

// Command -> User -> /INVENTORY DUPES:
function userDuplicates_ES(user, userData, globalID) {
    let card_duplicates = userParser.cards.duplicates(userData.card_inventory, { globalID });

    // Create a base embed
    let { embed } = new messageTools.Embedinator(null, {
        author: user,
        title: "%USER | dupes",
        description: `\`${globalID}\` is not a valid GID`
    });

    if (!card_duplicates) return [embed];
    if (card_duplicates.card_duplicates.length === 0) {
        embed.setDescription("You do not have any dupes with this GID")
        return [embed];
    }

    card_duplicates = card_duplicates.cards.map(card => cardManager.parse.fromCardLike(card));

    let card_duplicates_f = card_duplicates.map(card => {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === userData.card_selected_uid);

        return cardManager.toString.inventory(card, {
            favorited: isFavorite,
            selected: isSelected
        });
    });

    card_duplicates_f = arrayTools.chunk(card_duplicates_f, 10);

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < card_duplicates_f.length; i++) {
        let { embed: _embed } = new messageTools.Embedinator(null, { title: "%USER | dupes", author: user });

        // Add details to the embed
        _embed.setDescription(card_duplicates_f[i].join("\n"))
            .setFooter({
                text: `Page %PAGE/%PAGE_COUNT Total: %TOTAL_CARDS`
                    .replace("%PAGE", i + 1)
                    .replace("%PAGE_COUNT", card_duplicates_f.length)
                    .replace("%TOTAL_CARDS", card_duplicates.length)
            });

        // Set the embed thumbnail to the card's image if available
        if (card_duplicates[0].imageURL) _embed.setThumbnail(card_duplicates[0].imageURL);

        embeds.push(_embed);
    }

    // Return the embeds array
    return embeds;
}

// Command -> User -> /VIEW CARD:VAULT
function userVault_ES(user, userData) {
    // Create a base embed
    let embed_template = () => new messageTools.Embedinator(null, {
        title: "%USER | vault", author: user
    }).embed;

    let lockedCards = userData.card_inventory.filter(card => card.locked);
    if (lockedCards.length === 0) {
        let _embed = embed_template();
        _embed.setDescription("You don't have any \`🔒 locked\` cards");

        return [_embed];
    }

    lockedCards = lockedCards.map(cardLike => cardManager.parse.fromCardLike(cardLike));

    let lockedCards_f = lockedCards.map(card => {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === userData.card_selected_uid);

        return cardManager.toString.inventory(card, {
            favorited: isFavorite,
            selected: isSelected
        });
    });

    lockedCards_f = arrayTools.chunk(lockedCards_f, 10);

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < lockedCards_f.length; i++) {
        let _embed = embed_template();

        // Add details to the embed
        _embed.setDescription(lockedCards_f[i].join("\n"))
            .setFooter({
                text: `page %PAGE of %PAGE_COUNT | total cards: %TOTAL_CARDS`
                    .replace("%PAGE", i + 1)
                    .replace("%PAGE_COUNT", lockedCards_f.length)
                    .replace("%TOTAL_CARDS", lockedCards.length)
            });

        embeds.push(_embed);
    }

    // Return the embeds array
    return embeds;
}



/** @param {"uid" | "global" | "favorite" | "idol"} viewStyle */
/* function userView_ES(user, userData, card, viewStyle = "uid", showDuplicates = true) {
    // Create the embed
    let embed = new EmbedBuilder().setColor(botSettings.embed.color || null);
    let embed_title = "%USER | view";

    switch (viewStyle) {
        case "uid":
            let duplicate_count = 0; if (showDuplicates) {
                let { card_duplicates } = userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID });
                duplicate_count = card_duplicates.length;
            }

            // Whether or not this is the user's favorite card
            let isFavorite = (card.uid === userData.card_favorite_uid);

            // Whether or not this is the user's selected card
            let isSelected = (card.uid === userData.card_selected_uid);

            // Whether or not this is on the user's team
            let isOnTeam = (userData.card_team_uids.includes(card.uid));

            embed.setDescription(cardManager.toString.inventory(card, {
                duplicateCount: duplicate_count,
                favorited: isFavorite,
                selected: isSelected,
                team: isOnTeam
            }));
            break;

        case "global":
            embed.setDescription(cardManager.toString.inventory(card, { simplify: true }));
            break;

        case "favorite":
            embed_title = "%USER | favorite"
            embed.setDescription(cardManager.toString.inventory(card, { favorited: true }));
            break;

        case "idol":
            embed_title = "%USER | idol"
            embed.setDescription(cardManager.toString.inventory(card, { selected: true }));
            break;
    }

    // Set the title and author icon for the embed
    embed.setAuthor({ name: embed_title.replace("%USER", user.username), iconURL: user.avatarURL({ dynamic: true }) })

    // Add the card image to the embed if available
    if (card.imageURL) embed.setImage(card.imageURL);

    // Return the embed
    return embed;
} */

// Command -> User -> /TEAM VIEW
function userTeamView_ES(user, userData) {
    // Convert the user's card_inventory into an array
    let teamCards = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids);

    // Create a base embed
    let { embed } = new messageTools.Embedinator(null, {
        author: user,
        title: "%USER | team",
        description: "You don't have a \`🧑🏾‍🤝‍🧑🏼 team\` yet"
    });

    // Return the base embed if the user doesn't have a team set
    if (teamCards.length === 0) return [embed];

    // Parse every card in the (cards) array into a readable [String] entry
    // then split the array into groups of 10 cards each
    // so we can easily create embed inventory pages of only 10 entries per
    let teamCards_f = arrayTools.chunk(teamCards.map(card => {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        return cardManager.toString.inventory(card, { favorited: isFavorite });
    }), 1);

    let ability_total = (() => {
        let total = 0;

        // Add together the ability of each card in the user's team
        teamCards.forEach(card => total += card.stats.ability);

        return stringTools.formatNumber(total);
    })();

    let reputation_total = (() => {
        let total = 0;

        // Add together the reputation of each card in the user's team
        teamCards.forEach(card => total += card.stats.reputation);

        return stringTools.formatNumber(total);
    })();

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < teamCards_f.length; i++) {
        let { embed: _embed } = new messageTools.Embedinator(null, { title: "%USER | team", author: user });

        // Add details to the embed
        _embed.setDescription(teamCards_f[i].join("\n"))
            .setFooter({
                text: "Page %PAGE/%PAGE_COUNT | Total :: ABI. %TOTAL_ABILITY / REP. %TOTAL_REPUTATION"
                    .replace("%PAGE", i + 1)
                    .replace("%PAGE_COUNT", teamCards_f.length)
                    .replace("%TOTAL_ABILITY", ability_total)
                    .replace("%TOTAL_REPUTATION", reputation_total)
            });

        // Add the card's image if available
        if (teamCards[i].imageURL) _embed.setImage(teamCards[i].imageURL);

        embeds.push(_embed);
    }

    // Return the embed array
    return embeds;
}

// Command -> User -> /GIFT
function userGift_ES(user, recipient, cards) {
    let fromTo = `**From:** ${user}\n**To:** ${recipient}`;

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | gift`, iconURL: user.avatarURL({ dynamic: true }) })
        .setColor(botSettings.embed.color || null);

    if (cards.length === 1) {
        embed.setDescription(cardManager.toString.inventory(cards[0]) + "\n\n" + fromTo);

        // Add the card image to the embed if available
        if (cards[0].imageURL) embed.setImage(cards[0].imageURL);

    } else {
        embed.setDescription(cards.map(card => cardManager.toString.inventory(card)).join("\n") + "\n\n" + fromTo);

        // Add the last card's image to the embed if available
        let card_last = cards.slice(-1)[0];
        if (card_last.imageURL) embed.setImage(card_last.imageURL);
    }

    // Return the embed
    return embed;
}

module.exports = {
    // General Commands
    generalCollections_ES,
    generalShop_ES,
    generalSetView_ES,
    generalView_ES,

    // User Commands
    userDrop_ES,

    userProfile_ES,
    userMissing_ES,
    userCooldowns_ES,

    userInventory_ES,
    userDuplicates_ES,
    userVault_ES,

    // userView_ES,
    userTeamView_ES,

    userGift_ES
};