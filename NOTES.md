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

<!-- Changelog -->
- **`Command Changes`**

- **`/Inventory`**
 - Can now mix and match filters and separate multiple options by commas (,)
 - Can now filter by dupes only by using `/inventory` `dupes:all`
 - Added a new sorting option: `📅 Recent`