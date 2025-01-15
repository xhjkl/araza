import * as anchor from '@coral-xyz/anchor'
import type { Program } from '@coral-xyz/anchor'

import {
	createAssociatedTokenAccount,
	createMint,
	mintTo,
	TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import type { PublicKey } from '@solana/web3.js'

import type { Araza } from '@generated-types/araza'

import { expect } from 'chai'

/** Partially applied `confirmTransaction` for code brevity */
const untilConfirmed = async (provider: anchor.AnchorProvider, tx: string) => {
	const latestBlockHash = await provider.connection.getLatestBlockhash()
	await provider.connection.confirmTransaction({
		signature: tx,
		blockhash: latestBlockHash.blockhash,
		lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
	})
}

const provider = anchor.AnchorProvider.local()
anchor.setProvider(provider)

const owner = anchor.web3.Keypair.generate()
let ownersUsdcAccount!: PublicKey
let ownersDdAccount!: PublicKey
const treasurer = anchor.web3.Keypair.generate()

const program = anchor.workspace.Araza as Program<Araza>

let usdcMint!: PublicKey
const [ddMint, _ddMintBump] = anchor.web3.PublicKey.findProgramAddressSync(
	[Buffer.from('mint/dd')],
	program.programId,
)

before(async () => {
	const airdrop = await provider.connection.requestAirdrop(
		owner.publicKey,
		1000000000,
	)
	await untilConfirmed(provider, airdrop)

	const airdropForTreasurer = await provider.connection.requestAirdrop(
		treasurer.publicKey,
		1000000000,
	)
	await untilConfirmed(provider, airdropForTreasurer)

	usdcMint = await createMint(
		provider.connection,
		owner,
		owner.publicKey,
		owner.publicKey,
		6,
		void null,
		void null,
		TOKEN_2022_PROGRAM_ID,
	)
})

describe('araza', () => {
	it('initializes', async () => {
		// Given a clean slate,
		// when we initialize the program:
		const tx = await program.methods
			.initialize()
			.accounts({
				signer: provider.wallet.publicKey,
				treasurer: treasurer.publicKey,
			})
			.rpc()
		console.log('Initialized at', tx)
		await untilConfirmed(provider, tx)
		// with two transactions:
		const tx2 = await program.methods
			.configure()
			.accounts({
				signer: provider.wallet.publicKey,
				usdcMint,
				tokenProgram: TOKEN_2022_PROGRAM_ID,
			})
			.rpc()
		// then both of those should succeed.
		await untilConfirmed(provider, tx2)
		console.log('Configured at', tx2)
	})

	it('gives the user some USDC', async () => {
		// When we associate an account with user's:
		ownersUsdcAccount = await createAssociatedTokenAccount(
			provider.connection,
			owner,
			usdcMint,
			owner.publicKey,
			{},
			TOKEN_2022_PROGRAM_ID,
		)
		// And when we mint USDC to it:
		const tx = await mintTo(
			provider.connection,
			owner,
			usdcMint,
			ownersUsdcAccount,
			owner,
			1000_000000n,
			[],
			{},
			TOKEN_2022_PROGRAM_ID,
		)
		await untilConfirmed(provider, tx)
		// Then the balance should be exactly what we minted:
		const balanceAfter =
			await provider.connection.getTokenAccountBalance(ownersUsdcAccount)
		expect(balanceAfter.value.uiAmount).to.be.eq(1000)
	})

	it('accepts deposit from users', async () => {
		// Given a freshly made DD account:
		ownersDdAccount = await createAssociatedTokenAccount(
			provider.connection,
			owner,
			ddMint,
			owner.publicKey,
			{},
			TOKEN_2022_PROGRAM_ID,
		)

		// And given a balance of some USDC:
		const usdcBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersUsdcAccount)
		// And given a balance of zero DD:
		const ddBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)

		// When we deposit some USDC:
		const tx = await program.methods
			.deposit(new anchor.BN(223_000000))
			.accounts({
				user: owner.publicKey,
				fromAccount: ownersUsdcAccount,
				// @ts-expect-error
				toAccount: ownersDdAccount,
				usdcMint,
				tokenProgram: TOKEN_2022_PROGRAM_ID,
			})
			.signers([owner])
			.rpc()
		await untilConfirmed(provider, tx)
		const usdcBalanceAfter =
			await provider.connection.getTokenAccountBalance(ownersUsdcAccount)
		const ddBalanceAfter =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)

		// Then the USDC balance should go down:
		expect(usdcBalanceAfter.value.uiAmount).to.be.lt(
			usdcBalanceBefore.value.uiAmount ?? 0,
		)
		// And the DD balance should go up:
		expect(ddBalanceAfter.value.uiAmount).to.be.gt(
			ddBalanceBefore.value.uiAmount ?? 0,
		)
		// And then those balances should add up:
		expect(
			(usdcBalanceAfter.value.uiAmount ?? 0) +
				(ddBalanceAfter.value.uiAmount ?? 0),
		).to.be.eq(
			(usdcBalanceBefore.value.uiAmount ?? 0) +
				(ddBalanceBefore.value.uiAmount ?? 0),
		)
	}).timeout(10_000)

	it('allows users to withdraw their DD', async () => {
		// Given a balance of some USDC:
		const usdcBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersUsdcAccount)
		// And given a balance of some DD:
		const ddBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)

		// When we withdraw some, but not all, DD:
		const tx = await program.methods
			.redeem(new anchor.BN(123_000000))
			.accounts({
				user: owner.publicKey,
				fromAccount: ownersDdAccount,
				toAccount: ownersUsdcAccount,
				usdcMint,
				tokenProgram: TOKEN_2022_PROGRAM_ID,
			})
			.signers([owner])
			.rpc()
		await untilConfirmed(provider, tx)

		// Then the DD balance should go down:
		const ddBalanceAfter =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)
		expect(ddBalanceAfter.value.uiAmount).to.be.lt(
			ddBalanceBefore.value.uiAmount ?? 0,
		)
		// And the USDC balance should go up:
		const usdcBalanceAfter =
			await provider.connection.getTokenAccountBalance(ownersUsdcAccount)
		expect(usdcBalanceAfter.value.uiAmount).to.be.gt(
			usdcBalanceBefore.value.uiAmount ?? 0,
		)
		// And then those balances should add up:
		expect(
			(usdcBalanceAfter.value.uiAmount ?? 0) +
				(ddBalanceAfter.value.uiAmount ?? 0),
		).to.be.eq(
			(usdcBalanceBefore.value.uiAmount ?? 0) +
				(ddBalanceBefore.value.uiAmount ?? 0),
		)
	})

	it('offers DD for fiat exchange', async () => {
		// Given some DD:
		const ddBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)

		// When we offer our DD to be exchanged for fiat:
		const {
			signature: tx,
			pubkeys: { escrow },
		} = await program.methods
			.offerDd(new anchor.BN(100_000000))
			.accounts({
				user: owner.publicKey,
				fromAccount: ownersDdAccount,
				tokenProgram: TOKEN_2022_PROGRAM_ID,
			})
			.signers([owner])
			.rpcAndKeys()
		await untilConfirmed(provider, tx)

		// Then we expect the DD balance to go down:
		const ddBalanceAfterOffered =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)
		expect(ddBalanceAfterOffered.value.uiAmount).to.be.lt(
			ddBalanceBefore.value.uiAmount ?? 0,
		)

		// And we expect the escrow account to have been created:
		const escrowBalance =
			await provider.connection.getTokenAccountBalance(escrow)
		expect(escrowBalance.value.uiAmount).to.be.eq(100)
	}).timeout(10_000)

	it('releases funds from escrow', async () => {
		// Given an escrow account with some DD:
		const ddBalanceBefore =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)
		expect(ddBalanceBefore.value.uiAmount).to.be.eq(0)

		// When we release the funds:
		const tx = await program.methods
			.releaseFunds()
			.accounts({
				user: owner.publicKey,
				treasurer: treasurer.publicKey,
				beneficiary: ownersDdAccount,
				tokenProgram: TOKEN_2022_PROGRAM_ID,
			})
			.signers([treasurer])
			.rpc()
		await untilConfirmed(provider, tx)

		// Then the beneficiary should have received the DD:
		const ddBalanceAfter =
			await provider.connection.getTokenAccountBalance(ownersDdAccount)
		expect(ddBalanceAfter.value.uiAmount).to.be.eq(100)

		// And the escrow account should be closed:
		const [escrowAccount] = anchor.web3.PublicKey.findProgramAddressSync(
			[Buffer.from('escrow'), owner.publicKey.toBuffer()],
			program.programId,
		)
		const escrowAccountInfo =
			await provider.connection.getAccountInfo(escrowAccount)
		expect(escrowAccountInfo).to.be.null
	}).timeout(10_000)
})
