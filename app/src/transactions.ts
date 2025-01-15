import { Connection } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'

import {
	getAssociatedTokenAddressSync,
	TOKEN_PROGRAM_ID as tokenProgram,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

import IDL from './araza.json'
import type { Araza } from './araza.ts'

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

const ddMint = new PublicKey('8qhVugtb715mhHALxQuu8mRHc5nDT5pt39qHHR5DkJpq')
const usdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')

export const deposit = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	await program()
		.methods.deposit(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			// @ts-expect-error
			toAccount,
			usdcMint,
			tokenProgram,
		})
		.rpc()
}

export const redeem = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	await program()
		.methods.redeem(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			toAccount,
			usdcMint,
			tokenProgram,
		})
		.rpc()
}

export const offerDd = async (publicKey: PublicKey, amount: number) => {
	const fromAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	await program()
		.methods.offerDd(new anchor.BN(amount))
		.accounts({
			user: publicKey,
			fromAccount,
			tokenProgram,
		})
		.rpc()
}

export const offerFiat = async (publicKey: PublicKey, amount: number) => {
	await program()
		.methods.offerFiat(new anchor.BN(amount))
		.accounts({
			user: publicKey,
		})
		.rpc()
}
