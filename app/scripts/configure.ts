import type { Araza } from '@generated-types/araza'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import * as anchor from '@coral-xyz/anchor'

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider)

const program = anchor.workspace.Araza as anchor.Program<Araza>

const main = async () => {
	const tx = await program.methods
		.configure()
		.accounts({
			signer: provider.wallet.publicKey,
			// Devnet USDC:
			// [https://spl-token-faucet.com/?token-name=USDC-Dev]
			usdcMint: new PublicKey(
				'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
			),
			// Classic token program:
			tokenProgram: TOKEN_PROGRAM_ID,
		})
		.rpc()
	console.log(tx)
}

main().catch(console.error)
