import type { Araza } from '@generated-types/araza'
import { PublicKey } from '@solana/web3.js'

import * as anchor from '@coral-xyz/anchor'

// Before executing this script,
//   * set the ANCHOR_WALLET environment variable to the path of your keypair
//   * set the ANCHOR_PROVIDER environment variable to the URL of the Solana RPC node
const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider)

const program = anchor.workspace.Araza as anchor.Program<Araza>

const main = async () => {
	const tx = await program.methods
		.initialize()
		.accounts({
			signer: provider.wallet.publicKey,
			// Key in our possession:
			treasurer: new PublicKey('Az7UQnVWqxHS3eVi8xmodXQPqSDh1HNcc5iryNbuYTLU'),
		})
		.rpc()
	console.log(tx)
}

main().catch(console.error)
