const { EmbedBuilder, TimestampStyles } = require('discord.js');

const { markdown } = require('./discordTools');
const { bold, italic, inline, quote, link, space } = markdown;

const { botSettings, shopSettings, userSettings } = require('../configs/heejinSettings.json');
const { arrayTools, stringTools, numberTools, dateTools } = require('../modules/jsTools');
const { messageTools } = require('../modules/discordTools');
const cardManager = require('../modules/cardManager');
const badgeManager = require('../modules/badgeManager');
const userParser = require('../modules/userParser');


// Command -> General -> /COLLECTIONS
/** @param {"ascending" | "decending"} order */
function globalCollections_ES(user, options = { order: "decending", filter: { group: "", category: "" } }) {
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
            .setDescription(group[0] ? group.join("\n") : "no collections were found.")
            .setFooter({ text: `page ${pageIndex++} of ${collections_f.length || 1} • total sets: ${cards_unique.length}` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the array of embeds
    return embeds;
}

// Command -> General -> /SHOP
function globalShop_ES(user) {
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
        .setColor(botSettings.embedColor || null);

    let embed_list = () => {
        let cards_f = cards_shop_unique.map((card, idx) => cardManager.toString.setEntry(card, card_sets[idx].length, true));

        // Create the embed
        let embed = embed_template()
            .setDescription(cards_f ? cards_f.join("\n") : "the shop is empty!");

        // Return the embed
        return embed;
    };

    let embed_all = () => {
        let cardSets_f = card_sets.map(set => set.map(card => cardManager.toString.shopEntry(card)));

        // Break up sets into multiple pages to retain there being a max of 10 cards per page
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
            // Create the embed page
            let embed = embed_template()
                .setDescription(cardSets_f[i].join("\n"))
                .setFooter({ text: `page ${i + 1} of ${cardSets_f.length || 1}` });

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
                let embed = embed_template()
                    .setDescription(cardSet_f[i].join("\n"))
                    .setFooter({ text: `page ${i + 1} of ${cardSet_f.length || 1}` });

                _embeds.push(embed);
            }

            embeds.push(_embeds);
        }

        return embeds;
    };

    let embed_badges = () => {
        let badges_f = badgeManager.badges.map(badge => badgeManager.toString.shop(badge));
        badges_f = arrayTools.chunk(badges_f, 10);

        let embeds = [];

        for (let i = 0; i < badges_f.length; i++) {
            let embed = embed_template()
                .setDescription(badges_f[i].join("\n"))
                .setFooter({ text: `page ${i + 1} of ${badges_f.length || 1}` });

            embeds.push(embed);
        }

        return embeds;
    }

    // Return the different embed views
    return [
        embed_list(),
        embed_all(),
        ...embed_cardSets(),
        embed_badges()
    ];
}

// Command -> User -> /DROP
function userDrop_ES(user, cards, cards_isDuplicate, dropTitle = "drop") {
    if (!Array.isArray(cards)) cards = [cards];
    if (!Array.isArray(cards_isDuplicate)) cards_isDuplicate = [cards_isDuplicate];

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | ${dropTitle}`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cards.map((card, idx) => cardManager.toString.inventory(card, {
            isDuplicate: cards_isDuplicate[idx] || false,
            simplify: true
        })).join("\n"))
        .setColor(botSettings.embedColor || null);

    let card_last = cards.slice(-1)[0];
    if (card_last.imageURL) embed.setImage(card_last.imageURL);

    return embed;
}

// Command -> User -> /COOLDOWNS
function userCooldowns_ES(user, userData) {
    let cooldowns = Object.keys(userSettings.cooldowns).map(name => ({ name, timestamp: 0 }));

    let cooldowns_user = [];
    userData.cooldowns.forEach((value, key) => cooldowns_user.push({ name: key, timestamp: value }));

    cooldowns_user.forEach(cooldown => {
        let spliceIndex = cooldowns.findIndex(c => c.name === cooldown.name);
        if (spliceIndex >= 0) cooldowns.splice(spliceIndex, 1, cooldown);
    });

    let cooldowns_f = cooldowns.map(cooldown => {
        let cooldownETA = dateTools.eta(cooldown.timestamp, true);

        return "\`%VISUAL %NAME:\` %AVAILABILITY"
            .replace("%VISUAL", cooldownETA ? "❌" : "✔️")
            .replace("%NAME", stringTools.toTitleCase(cooldown.name.replace(/_/g, " ")))
            .replace("%AVAILABILITY", bold(true, cooldownETA
                ? `<t:${numberTools.milliToSeconds(cooldown.timestamp)}:${TimestampStyles.RelativeTime}>`
                : "Available"));
    });

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | cooldowns`, iconURL: user.avatarURL({ dynamic: true }) })
        .setDescription(cooldowns_f.join("\n"))
        .setColor(botSettings.embedColor || null);

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
        let profile_info = "\`🥕 %BALANCE\` :: \`🃏 %CARD_TOTAL\` :: \`🎚️ LV. %LEVEL\`"
            .replace("%BALANCE", userData.balance)
            .replace("%CARD_TOTAL", `${userData.card_inventory.length}/${cardManager.cardTotal}`)
            .replace("%LEVEL", userData.level);

        _embed.addFields([{ name: "\`📄\` Information", value: quote(true, profile_info) }]);

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
        badges_f = badges_f.map(chunk_badges => quote(true, chunk_badges.join(" ")));

        // Add the badges to the embed
        // embed.addFields([{ name: "\`📛\` Badges", value: badges_f.join("\n") }]);
        _embed.setDescription(badges_f.join("\n"))

        // Return the embed
        return _embed;
    };

    let embed_card = (card) => {
        let _embed = embed_template();

        // Check if the card is favorited
        let isFavorited = card.uid === card_favorite?.uid;

        // Parse the card into a human readable string
        let card_f = cardManager.toString.inventory(card, { selected: true, favorited: isFavorited });

        // Add the card's information to the embed
        _embed.setDescription(card_f);

        // Add the card's image to the embed if available
        if (card.imageURL) _embed.setImage(card.imageURL);

        // Return the embed
        return _embed;
    };

    let embed_inventoryStats = () => {
        let _embed = embed_template();

        // Get the name of each card category
        let categories = Object.keys(cardManager.cards).map(category => stringTools.toTitleCase(category));
        // Get an array of each card category
        let allCards = Object.values(cardManager.cards);

        // Parse the user's card_inventory into fully detailed cards
        userData.card_inventory = userData.card_inventory.map(card => cardManager.parse.fromCardLike(card));

        // Create an array of the user's cards sorted by category
        let userCards = allCards.map(category => {
            // Get each unique card rarity from the current category
            let rarities = arrayTools.unique(category, (card, cardCompare) => card.rarity === cardCompare.rarity)
                .map(card => card.rarity);

            // Return an array of the user's cards that match that category
            return userData.card_inventory.filter(card => rarities.includes(card.rarity));
        });

        // Parse the sorted user cards into a readable string
        let inventoryStats_f = userCards.map((category, idx) => quote(true, "%CATEGORY: %STATS"
            .replace("%CATEGORY", bold(true, categories[idx]))
            .replace("%STATS", inline(true, "🃏", `${category.length}/${allCards[idx].length}`))
        ));

        // Set the embed's description to the inventory stat result
        // _embed.setDescription(inventoryStats_f.join("\n"));

        _embed.addFields(
            { name: "\`🗃️\` Normal", value: inventoryStats_f.slice(0, 5).join("\n"), inline: true },
            { name: "\`✨\` Special", value: inventoryStats_f.slice(5).join("\n"), inline: true }
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

        cards_user_f.push(cardManager.toString.inventory(card, {
            duplicate_count: card_duplicates.length,
            favorited: isFavorite,
            selected: isSelected
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
            .setFooter({ text: `page ${pageIndex++} of ${cards_user_f.length || 1} | total cards: ${cards_user_primary.length} ` })
            .setColor(botSettings.embedColor || null);

        // Push the newly created embed to our collection
        embeds.push(embed_page);
    };

    // Return the embed array
    return embeds;
}

function userDuplicates_ES(user, userData, globalID) {
    let card_duplicates = userParser.cards.duplicates(userData.card_inventory, { globalID });

    // Create a base embed
    let { embed } = new messageTools.Embedinator(null, {
        author: user,
        title: "%USER | duplicates",
        description: `\`${globalID}\` is not a valid global card ID.`
    });

    if (!card_duplicates) return [embed];
    if (card_duplicates.card_duplicates.length === 0) {
        embed.setDescription("You don't have any duplicates of that card.")
        return [embed];
    }

    card_duplicates = [card_duplicates.card_primary, ...card_duplicates.card_duplicates]
        .map(card => cardManager.parse.fromCardLike(card));

    let card_duplicates_f = []; for (let card of card_duplicates) {
        // Whether or not this is the user's favorited card
        let isFavorite = (card.uid === userData.card_favorite_uid);

        // Whether or not this is the user's selected card
        let isSelected = (card.uid === userData.card_selected_uid);

        card_duplicates_f.push(cardManager.toString.inventory(card, {
            favorited: isFavorite,
            selected: isSelected
        }));
    }

    card_duplicates_f = arrayTools.chunk(card_duplicates_f, 10);

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < card_duplicates_f.length; i++) {
        let { embed: _embed } = new messageTools.Embedinator(null, { title: "%USER | duplicates", author: user });

        // Add details to the embed
        _embed.setDescription(card_duplicates_f[i].join("\n"))
            .setFooter({
                text: `page %PAGE of %PAGE_COUNT | total cards: %TOTAL_CARDS`
                    .replace("%PAGE", i + 1)
                    .replace("%PAGE_COUNT", card_duplicates_f.length)
                    .replace("%TOTAL_CARDS", card_duplicates.length)
            });

        embeds.push(_embed);
    }

    // Return the embeds array
    return embeds;
}

// Command -> User -> /VIEW UID | /VIEW GID | /VIEW FAVORITE
/** @param {"uid" | "global" | "favorite" | "idol"} viewStyle */
function userView_ES(user, userData, card, viewStyle = "uid", showDuplicates = true) {

    // Create the embed
    let embed = new EmbedBuilder().setColor(botSettings.embedColor || null);
    let embed_title = "%USER | view";

    switch (viewStyle) {
        case "uid":
            let duplicate_count = 0; if (showDuplicates) {
                let { card_duplicates } = userParser.cards.duplicates(userData.card_inventory, { globalID: card.globalID });
                duplicate_count = card_duplicates.length;
            }

            // Whether or not this is the user's favorite card
            let isFavorite = (card.uid === userData.card_favorite_uid);

            embed.setDescription(cardManager.toString.inventory(card, { duplicate_count, favorited: isFavorite }));
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
}

// Command -> User -> /TEAM VIEW
function userTeamView_ES(user, userData) {
    // Convert the user's card_inventory into an array
    let teamCards = userParser.cards.getMultiple(userData.card_inventory, userData.card_team_uids);

    // Create a base embed
    let { embed } = new messageTools.Embedinator(null, {
        author: user,
        title: "%USER | team",
        description: "You don't have a team set yet."
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

    // Create the embeds
    let embeds = [];

    for (let i = 0; i < teamCards_f.length; i++) {
        let { embed: _embed } = new messageTools.Embedinator(null, { title: "%USER | team", author: user });

        // Add details to the embed
        _embed.setDescription(teamCards_f[i].join("\n"))
            .setFooter({
                text: "page %PAGE of %PAGE_COUNT | team ability: %TOTAL_ABILITY"
                    .replace("%PAGE", i + 1)
                    .replace("%PAGE_COUNT", teamCards_f.length)
                    .replace("%TOTAL_ABILITY", ability_total)
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
    let fromTo = `from: ${user} to: ${recipient}`;

    // Create the embed
    let embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} | gift`, iconURL: user.avatarURL({ dynamic: true }) })
        .setColor(botSettings.embedColor || null);

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
    globalCollections_ES,
    globalShop_ES,

    // User Commands
    userDrop_ES,
    userCooldowns_ES,
    userProfile_ES,
    userInventory_ES,
    userDuplicates_ES,
    userView_ES,
    userTeamView_ES,
    userGift_ES
};