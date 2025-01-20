# 🥭 araza

**araza** is a protocol for exchanging value without borders.

It allows you to deposit USDC and get ĐĐ in return. It also allows you to securely swap ĐĐ tokens between users using a decentralized escrow.

## How it Works
  * Users deposit their USDC into the protocol.
  * The protocol mints ĐĐ tokens for the depositor.
  * Users can offer their ĐĐ tokens to other users.
  * The daemon matches the user's offer with the best available offer.
  * The daemon monitors c2c payments in the received bank statements and reconciles them with the user's ĐĐ offer pair.
  * The daemon safely releases the funds once the c2c payment is confirmed on both ends.

## Depositing and Redeeming

This flow will give you ĐĐ tokens in exchange for USDC, or redeem them back for USDC.

First, make sure you have the latest Phantom wallet installed. Other wallets are not supported yet.

  * https://www.phantom.app

Once you have the Phantom wallet installed, make sure it points to the Solana Devnet:

  * <details>
      <summary>Make sure Phantom is pointing to Solana Devnet</summary>
      <img src="./devnet.png" alt="Phantom Wallet">
    </details>

Then, with Phantom facing devnet, get yourself some mock USDC:

  * https://spl-token-faucet.com/?token-name=USDC-Dev

After you have some mock USDC, you can deposit it into the protocol. Go here:

  * https://araza.fly.dev/

And follow the instructions on the page to deposit your USDC,
or to redeem your ĐĐ back for USDC.

After that, you will see that your ĐĐ balance has increased.

## On/off-ramp

The on/off-ramp is a process of exchanging ĐĐ you already have for real-life currency.
Naturally, we will not use the real money on devnet, so you we'll have to pretend.

To sell your ĐĐ, you'll need to do the following:

  * Make sure you already have some ĐĐ in your account, [see above](#depositing-and-redeeming)
  * Push "ĐĐ -> Fiat" button
  * Sign the two transactions that will pop up in your Phantom wallet
  * In another tab, push "Fiat -> ĐĐ" button
  * * or, for simplicity, you can just push "ĐĐ -> Fiat" button at the same browser window, and this way you will sell your tokens to yourself, but you will still complete the flow
  * Wait until you see "Your ĐĐ offer ..." in the balances section
  * Now, go to the admin page by the link below
  * Submit the bank statement of the both ends of the c2c payment
  * Wait a bit
  * Now, back to the dashboard, and you will see the balances updated

## Questions and Answers

*Why do we have a separate token? Why not just use USDC?*

Firstly, introducing a separate token simplifies the addition of new supported tokens to the protocol.
Currently, only USDC is supported, but as we incorporate more tokens, the on/off-ramp process remains the same,
ensuring the protocol's surface area stays minimal.

Secondly, using an intermediate token facilitates easier pairing of buyers and sellers in C2C payments.
With this approach, we only need to match transactions based on the amount and payment type,
rather than the specific tokens being exchanged.

Additionally, in the event of a dispute, we can freeze a designated amount of tokens,
ensuring that funds involved in any operation remain secure and unaffected by external factors.

## Next Steps

The next logical step is to implement zk-based private balances,
similar to [Elusiv](https://docs.elusiv.io).
This enhancement will ensure the protocol's integrity while providing users with privacy regarding their balances.

Another application of zk-proofs is establishing proof of non-membership in the risk list, which will help maintain the protocol's regulatory compliance.

A beneficial side effect of these implementations is the improved sharding of our oracle, as both the risk-list accumulator and the balances commitment tree will be accessible on-chain.

## Naming

It's a [fruit](https://en.wikipedia.org/wiki/Eugenia_stipitata) serving as a reasonably unique token.
