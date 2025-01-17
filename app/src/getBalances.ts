import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import IDL from '@generated-types/araza.json'

const MINT_ADDRESSES_OF_TOKEN: { [key: string]: string } = {
	// https://spl-token-faucet.com/?token-name=USDC-Dev
	usdc: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
	dd: '8qhVugtb715mhHALxQuu8mRHc5nDT5pt39qHHR5DkJpq',
}

/**
 * Fetches the native SOL balance and associated token balances for the given wallet address.
 *
 * @param publicKeyString The public key of the wallet as a string.
 * @returns [ticker: balance]
 */
export const getAllBalances = async (
	publicKeyString: string,
): Promise<{ [key: string]: number }> => {
	try {
		const connection = new Connection('https://api.devnet.solana.com')
		const publicKey = new PublicKey(publicKeyString)

		// Fetch native SOL balance
		const solBalanceLamports = await connection.getBalance(publicKey)
		const solBalance = solBalanceLamports / 1e9

		// Fetch outstanding offer
		const [ddEscrowAddress, _] = PublicKey.findProgramAddressSync(
			[Buffer.from('escrow'), publicKey.toBuffer()],
			new PublicKey(IDL.address),
		)
		let ddEscrowBalance = 0
		try {
			const balanceResult =
				await connection.getTokenAccountBalance(ddEscrowAddress)
			ddEscrowBalance = balanceResult.value.uiAmount || 0
		} catch (error) {}

		// Fetch all token accounts by owner
		const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
			publicKey,
			{
				programId: TOKEN_PROGRAM_ID,
			},
		)

		const tokens: { [key: string]: number } = {}

		for (const { pubkey: _, account } of tokenAccounts.value) {
			const parsedInfo = account.data.parsed.info
			const mintAddress = parsedInfo.mint
			const amount = parsedInfo.tokenAmount.uiAmount

			// Find the token symbol based on mint address
			const symbol = Object.keys(MINT_ADDRESSES_OF_TOKEN).find(
				(key) => MINT_ADDRESSES_OF_TOKEN[key] === mintAddress,
			)

			if (symbol && amount) {
				tokens[symbol] = amount
			}
		}

		return {
			sol: solBalance,
			ddEscrow: ddEscrowBalance,
			...tokens,
		}
	} catch (error) {
		console.error('While fetching balances:', error)
		return {
			sol: 0,
			usdc: 0,
			dd: 0,
			ddEscrow: 0,
		}
	}
}
