- **TODO**:
 - increment quest balance for sell
 - ignore quest database actions if there's no active quest
 - fix duplicate user quest data inserts
 - add a charm section to the user's profile

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

- **Untested Commands**
 - /view
 - /set
 - /stage
 - /quest

<!-- Changelog -->
- **`Overall Changes`**
 - Major design changes
 - Revamped the reminder system
 - Optimization improvements

- **`Command Changes`**
 - Can now use `/missing` on other players
 - Can now `/gift` unlimited cards

- **`/reminder`**
 - Use the `edit` option to toggle on/off a reminder
 - Use the `notify` option to change where your reminder is sent (`📫 DM` `💬 Channel`)

- **`/inventory`**
 - Can now mix and match filters and separate multiple options by commas (,)
 - Can now filter by dupes only by using `/inventory` `dupes:all`
 - Added a new sorting option: `📅 Recent`