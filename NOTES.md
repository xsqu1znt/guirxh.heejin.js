- **TODO**:
 - add an admin command to remove cards from the user
 - pagination reactions not using custom emojis

- **NEXT UPDATE**
 - [OPTIMIZATION] if the user filters their inventory, only fetch cards from the database that they need

- **Tested Commands**
 - /help
 - /start
 - /profile
 - /shop
 - /sell
 - /daily
 - /random
 - /quest
 - /inventory
 - /pay
 - /gift
 - /sell
 - /missing
 - /collections
 - /cooldowns
 - /embed
 - /drop
 - /reminder
 - /set
 - /view
 - /stage
 - /quest

<!-- Patches -->
- Fixed drop weekly breaking if there were no cards in the shop
- Fixed shop buy not using your carrots
- Fixed Dupe Repel charm breaking drop/card packs

<!-- Changelog -->
- `📰` **`Overall Changes`**
> - Major design changes
> - Revamped reminder system
> - Huge stability improvements
> - Optimization improvements
> - You'll now see an error message when commands fail
> - Added more filtering options to a few commands

- `⚙️` **`Quests`**
> - Much more stable and don't require using a command to update your progress
> - Now show individual progress for each objective
> - Added new small objectives
> - Will now end automatically

- `🛠️` **`Command Changes`**
> - `/gift` Can now gift unlimited cards
> - `/missing` Can now be used on other players
> - `/stage` Rivaling another player now requires each player to not be on cooldown
> - `/stage` Rival ability no longer nerfed if rivaling a player
> - `/reminder` Use the `edit` option to toggle on/off a reminder
> - `/reminder` Use the `notify` option to change where your reminder is sent (`📫 DM` or `💬 Channel`)
> - `/inventory` Can now mix and match filters and separate multiple options by comma `,`
> - `/inventory` Can now filter by dupes only by using `/inventory` `dupes:all`
> - `/inventory` Added a new sorting option: `📅 Recent`

- `➕` **`Charms`**: *charms are items that you can buy from the shop, each charm has a set duration and a `☀️ Chance` of working*
> - `⛔ Dupe Repel` - will lower the chance of getting a dupe when using `/drop`, or buying a `Card Pack` from the shop