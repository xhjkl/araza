import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import {
	getAssociatedTokenAddressSync,
	TOKEN_PROGRAM_ID as tokenProgram,
	ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
} from '@solana/spl-token'

import IDL from './araza.json'
import type { Araza } from './araza.ts'

const ddMint = new PublicKey('8qhVugtb715mhHALxQuu8mRHc5nDT5pt39qHHR5DkJpq')
const usdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')

let storedProgram: anchor.Program<Araza>
const program = () => {
	if (!storedProgram) {
		storedProgram = new anchor.Program(
			IDL as anchor.Idl,
			new anchor.AnchorProvider(
				new Connection('https://api.devnet.solana.com', 'finalized'),
				// biome-ignore lint/style/noNonNullAssertion: if we got here, we have a wallet
				self.phantom!.solana as unknown as anchor.Wallet,
			),
		) as unknown as anchor.Program<Araza>
	}
	return storedProgram
}

let connection: Connection | null = null
export const untilFinalized = async (tx: string) => {
	if (connection == null) {
		connection = new Connection('https://api.devnet.solana.com', 'finalized')
	}
	const latestBlockhash = await connection.getLatestBlockhash()
	await connection.confirmTransaction({
		blockhash: latestBlockhash.blockhash,
		lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
		signature: tx,
	})
}

export const deposit = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	// Oddly, without `ts-expect-error`'ed account below,
	// Anchor will enter an infinite loop in release builds.
	return await program()
		.methods.deposit(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			// @ts-expect-error
			toAccount,
			usdcMint,
			tokenProgram,
			associatedTokenProgram,
		})
		.rpc()
}

export const redeem = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	// Oddly, without `ts-expect-error`'ed account below,
	// Anchor will enter an infinite loop in release builds.
	return await program()
		.methods.redeem(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			toAccount,
			usdcMint,
			tokenProgram,
			// @ts-expect-error
			associatedTokenProgram,
		})
		.rpc()
}

export const offerDd = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	return await program()
		.methods.offerDd(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			tokenProgram,
		})
		.rpc()
}

export const offerFiat = async (publicKey: PublicKey, amount: number) => {
	return await program()
		.methods.offerFiat(new anchor.BN(amount))
		.accounts({
			user: publicKey,
		})
		.rpc()
}
