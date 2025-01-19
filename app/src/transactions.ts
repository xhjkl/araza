import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import {
	getAssociatedTokenAddressSync,
	TOKEN_PROGRAM_ID as tokenProgram,
	ASSOCIATED_TOKEN_PROGRAM_ID as associatedTokenProgram,
} from '@solana/spl-token'
import bs58 from 'bs58'

import IDL from '@generated-types/araza.json'
import type { Araza } from '@generated-types/araza'

const ddMint = new PublicKey('8qhVugtb715mhHALxQuu8mRHc5nDT5pt39qHHR5DkJpq')
const usdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')

const solanaRpcUrl = 'https://api.devnet.solana.com'

let storedProgram: anchor.Program<Araza>
const program = () => {
	if (!storedProgram) {
		storedProgram = new anchor.Program(
			IDL as anchor.Idl,
			new anchor.AnchorProvider(
				new Connection(solanaRpcUrl, 'finalized'),
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
		connection = new Connection(solanaRpcUrl, 'finalized')
	}
	const latestBlockhash = await connection.getLatestBlockhash()
	await connection.confirmTransaction({
		blockhash: latestBlockhash.blockhash,
		lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
		signature: tx,
	})
}

export const deposit = async (publicKey: PublicKey, amount: bigint) => {
	const fromAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	// Oddly, without `ts-expect-error`'ed account below,
	// Anchor will enter an infinite loop in release builds.
	return await program()
		.methods.deposit(new anchor.BN(`${amount}`))
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

export const redeem = async (publicKey: PublicKey, amount: bigint) => {
	const fromAccount = getAssociatedTokenAddressSync(ddMint, publicKey)
	const toAccount = getAssociatedTokenAddressSync(usdcMint, publicKey)
	// Oddly, without `ts-expect-error`'ed account below,
	// Anchor will enter an infinite loop in release builds.
	return await program()
		.methods.redeem(new anchor.BN(`${amount}`))
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

/** Generate a byte string that represents a deal type and its author */
const seal = ({
	amount,
	bankAccount,
	cryptoAddress,
}: { bankAccount: string; cryptoAddress: string; amount: string }) => {
	const encoder = new TextEncoder()
	// Values sorted in lexicographical order
	return encoder.encode(`${amount}\n${bankAccount}\n${cryptoAddress}`)
}

/** Ask the user to generate a proof that associates their bank account with their crypto address */
const askUserForSignature = async (amount: bigint, bankAccount: string) => {
	const solana = self.phantom?.solana
	if (!solana) {
		throw new Error('Solana wallet expected')
	}
	const publicKey = solana.publicKey
	try {
		const { signature } = await solana.signMessage(
			seal({
				amount: `${amount}`,
				bankAccount,
				cryptoAddress: publicKey.toBase58(),
			}),
		)
		return bs58.encode(signature)
	} catch (e) {
		// Apparently, user changed their mind
		console.error('did not sign:', e)
		return null
	}
}

export const offerDd = async (
	publicKey: PublicKey,
	amount: bigint,
	bankAccount: string,
) => {
	const signature = await askUserForSignature(amount, bankAccount)
	if (!signature) {
		return null
	}
	await fetch('/offer-dd', {
		method: 'POST',
		body: JSON.stringify({
			amount,
			bankAccount,
			publicKey: publicKey.toBase58(),
			signature,
		}),
	})
	return await program()
		.methods.offerDd(new anchor.BN(`${amount}`))
		.accounts({
			user: publicKey,
			fromAccount: getAssociatedTokenAddressSync(ddMint, publicKey),
			tokenProgram,
			// @ts-expect-error
			associatedTokenProgram,
		})
		.rpc()
}

export const offerFiat = async (
	publicKey: PublicKey,
	amount: bigint,
	bankAccount: string,
) => {
	const signature = await askUserForSignature(amount, bankAccount)
	if (!signature) {
		return null
	}
	await fetch('/offer-fiat', {
		method: 'POST',
		body: JSON.stringify({
			amount,
			bankAccount,
			publicKey: publicKey.toBase58(),
			signature,
		}),
	})
	return await program()
		.methods.offerFiat(new anchor.BN(`${amount}`))
		.accounts({
			user: publicKey,
		})
		.rpc()
}
