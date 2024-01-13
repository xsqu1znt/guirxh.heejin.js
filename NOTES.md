- **TODO**:
 - add an admin command to remove cards from the user
 - make the error message server dependant

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

<!-- Changelog -->
- **`Overall Changes`**
 - Major design changes
 - Revamped the reminder system
 - Added an error message when commands fail
 - Huge stability improvements
 - Optimization improvements

- **`Command Changes`**
 - Can now use `/missing` on other players
 - Can now `/gift` unlimited cards
 - Rivaling another player with `/stage` is more fleshed out
 - Rival ability no longer nerfed if rivaling a player with `/stage`

- **`/reminder`**
 - Use the `edit` option to toggle on/off a reminder
 - Use the `notify` option to change where your reminder is sent (`📫 DM` or `💬 Channel`)

- **`/inventory`**
 - Can now mix and match filters and separate multiple options by commas (,)
 - Can now filter by dupes only by using `/inventory` `dupes:all`
 - Added a new sorting option: `📅 Recent`