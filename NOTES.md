### **URGENT:**
 - make global id a link to the card's image in `/quest`
 - round down user xp
 - fix page jump

### **NEXT UP:**
 - `cardmanager.toString.setEntry` use card global ID instead of card object
 - add player target to `/missing`

### **NEW COMMAND IDEAS:**
 - `/setting` `section:purge` | removes card(s) from user
 - `/leaderboard` | a per server leaderboard
 - `/applycard` | update global ids

### **IDEAS:**
 - show player's start date in `/information`
 - request customs through heejin (uses modals)

### **UNRELATED REFACTORING:**
 - add fields to the `BetterEmbed` constructor and `send()`
 - `BetterEmbed.new()` | returns a new `BetterEmbed` with the same configuration

<!-- - - - - - - - - - - -->
# **CHANGELOG:** *(last: v2.0.95.1 | current: v2.1)*
 - overall design changes
 - optimized backend
 - removed gift/sell limit (due to discord's embed limitations)
 - added a list to `/reminders` to see what you have enabled/notification mode
 - can set whether your reminders are sent to the last channel the command was ran or through DMs