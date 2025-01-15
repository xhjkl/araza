import { createSignal, Match, Switch } from 'solid-js'
import { PublicKey } from '@solana/web3.js'

import useWallet from './useWallet'
import { getAllBalances } from './getBalances'
import { deposit, redeem } from './transactions'

const Dashboard = ({ publicKey }: { publicKey: string }) => {
	const [balances, setBalances] = createSignal<{ [key: string]: number }>({})
	const updateBalances = async () => {
		const balances = await getAllBalances(publicKey)
		setBalances(balances)
	}

	updateBalances()

	return (
		<div>
			<h1>🥭</h1>
			<h1>Araza Protocol</h1>
			<div class="card">
				<p>
					Welcome back, <code>{publicKey}</code>
				</p>
				<p style={{ 'font-style': 'oblique' }}>
					Please make sure you are on devnet by going to your Phantom's
					settings.
				</p>
				<p
					style={{
						display: 'grid',
						'grid-template-columns': '1fr 1fr',
						gap: '10px',
					}}
				>
					<span style={{ 'text-align': 'right' }}>Your SOL balance is</span>
					<b style={{ 'text-align': 'left' }}>{balances().sol ?? 0.0}</b>
				</p>
				<p
					style={{
						display: 'grid',
						'grid-template-columns': '1fr 1fr',
						gap: '10px',
					}}
				>
					<span style={{ 'text-align': 'right' }}>Your USDC balance is</span>
					<b style={{ 'text-align': 'left' }}>{balances().usdc ?? 0.0}</b>
				</p>
				<p
					style={{
						display: 'grid',
						'grid-template-columns': '1fr 1fr',
						gap: '10px',
					}}
				>
					<span style={{ 'text-align': 'right' }}>Your ĐĐ balance is</span>
					<b style={{ 'text-align': 'left' }}>{balances().dd ?? 0.0}</b>
				</p>
				<button type="button" onClick={updateBalances}>
					Refresh
				</button>
			</div>
			<div class="card">
				<div class="button-container">
					<button
						type="button"
						onClick={() => deposit(new PublicKey(publicKey), 100_000000)}
					>
						USDC → ĐĐ 
					</button>
					<span style={{ 'font-size': '10px' }}>&nbsp;</span>
					<button
						type="button"
						onClick={() => redeem(new PublicKey(publicKey), 100_000000)}
					>
						ĐĐ → USDC
					</button>
				</div>
			</div>
			{/* <div class="card">
				<div class="button-container">
					<button type="button" onClick={() => alert('Buy ĐĐ for USDC')}>
						ĐĐ → Fiat
					</button>
					<span style={{ 'font-size': '10px' }}>&nbsp;</span>
					<button type="button" onClick={() => alert('Sell ĐĐ for USDC')}>
						Fiat → ĐĐ
					</button>
				</div>
			</div> */}
		</div>
	)
}

const Welcome = ({ connectWallet }: { connectWallet: () => void }) => {
	return (
		<div>
			<h1>🥭</h1>
			<h1>Araza Protocol</h1>
			<div class="card">
				<p>
					This will help you buy, sell, and exchange <b>Đigital Đollars</b>.
				</p>
			</div>
			{self.phantom?.solana ? (
				<div class="card">
					<p>First, let's start things off by logging you in:</p>
					<button onClick={connectWallet} type="button">
						CONNECT THE WALLET
					</button>
				</div>
			) : (
				<div class="card">
					<p>
						To use this app, you need to install any Solana wallet you like.
					</p>
				</div>
			)}
		</div>
	)
}

const Main = () => {
	const { publicKey, connect } = useWallet()

	return (
		<Switch>
			<Match when={publicKey()}>
				<Dashboard
					publicKey={
						// biome-ignore lint/style/noNonNullAssertion: checked in the Switch
						publicKey()!
					}
				/>
			</Match>
			<Match when={!publicKey()}>
				<Welcome connectWallet={connect} />
			</Match>
		</Switch>
	)
}

declare global {
	interface Serializable {
		serialize: () => Uint8Array
	}

	interface StringConvertible {
		toString: () => string
	}

	interface Phantom {
		isPhantom: boolean
		publicKey: StringConvertible
		connect: () => Promise<{ publicKey: StringConvertible }>
		disconnect: () => Promise<void>
		signTransaction: (transaction: unknown) => Promise<Serializable>
		signAndSendTransaction: (transaction: unknown) => Promise<Serializable>
		on: (event: string, callback: () => void) => void
	}

	interface Window {
		// biome-ignore lint/suspicious/noConfusingVoidType: it's fine
		phantom: { solana: Phantom | void } | void
	}
}

export default Main
