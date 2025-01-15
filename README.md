# 🥭 araza

**araza** is a protocol for exchanging the value without borders.

It allows you to deposit USDC and get ĐĐ in return.
And it also allows you to securely swap ĐĐ between users
using a decentralized escrow.

## Core Flow

  * Users deposits USDC into the protocol
  * Protocol mints ĐĐ to the user
  * User can now offer ĐĐ to other users
  * The daemon will match the offer with the best offer
  * The daemon will see the c2c payments in the received bank statements, and reconcile them to the user's ĐĐ offer pair
  * The daemon will safely release the funds once the c2c payment is confirmed on both ends
