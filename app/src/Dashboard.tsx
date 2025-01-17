import {
	createResource,
	createSignal,
	Suspense,
	Show,
	type Resource,
	type Accessor,
} from 'solid-js'
import { PublicKey } from '@solana/web3.js'

import { getAllBalances } from './getBalances'
import { deposit, redeem, untilFinalized } from './transactions'

const Actions = (args: {
	publicKey: string
	pendingTx: Accessor<string | null>
	setPendingTx: (tx: string | null) => void
	refetchBalances: () => void
}) => {
	/** Lock the interface for the duration of `action`. */
	const doAction = async (action: () => Promise<string>) => {
		const tx = await action()
		args.setPendingTx(tx)
		await untilFinalized(tx)
		args.setPendingTx(null)
		args.refetchBalances()
	}
	return (
		<>
			<div class="card">
				<div class="button-container">
					<button
						type="button"
						onClick={async () => {
							await doAction(() =>
								deposit(new PublicKey(args.publicKey), 100_000000),
							)
						}}
					>
						USDC → ĐĐ
					</button>
					<button
						type="button"
						onClick={async () => {
							await doAction(() =>
								redeem(new PublicKey(args.publicKey), 100_000000),
							)
						}}
					>
						ĐĐ → USDC
					</button>
				</div>
			</div>
			<div class="card">
				<div class="button-container">
					<button type="button" onClick={() => alert('Buy ĐĐ for USDC')}>
						ĐĐ → Fiat
					</button>
					<button type="button" onClick={() => alert('Sell ĐĐ for USDC')}>
						Fiat → ĐĐ
					</button>
				</div>
			</div>
		</>
	)
}

const Balances = (args: {
	balances: Resource<{ [key: string]: number }>
	canRefresh: boolean
	refetch: () => void
}) => (
	<>
		<p class="ticker">
			<span>Your SOL balance is</span>
			<b>{args.balances()?.sol ?? 0.0}</b>
		</p>
		<p class="ticker">
			<span>Your USDC balance is</span>
			<b>{args.balances()?.usdc ?? 0.0}</b>
		</p>
		<p class="ticker">
			<span>Your ĐĐ balance is</span>
			<b>{args.balances()?.dd ?? 0.0}</b>
		</p>
		<Show when={true}>
			<p class="ticker">
				<span>Your ĐĐ offer is</span>
				<b>{0.0}</b>
			</p>
		</Show>
		<Show when={args.canRefresh}>
			<button type="button" onClick={args.refetch}>
				Refresh
			</button>
		</Show>
	</>
)

const Dashboard = ({ publicKey }: { publicKey: string }) => {
	const [pendingTx, setPendingTx] = createSignal(null as string | null)

	const [balances, { refetch }] = createResource(
		async () => await getAllBalances(publicKey),
	)

	refetch()

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
				<div style={{ height: '160px' }}>
					<Suspense fallback={<p>Loading...</p>}>
						<Balances
							balances={balances}
							canRefresh={pendingTx() == null}
							refetch={refetch}
						/>
					</Suspense>
				</div>
			</div>
			<Show
				when={pendingTx() == null}
				fallback={
					<p style={{ 'font-style': 'oblique' }}>
						Waiting for <code>{pendingTx()}</code> to confirm...
					</p>
				}
			>
				<Actions
					publicKey={publicKey}
					pendingTx={pendingTx}
					setPendingTx={setPendingTx}
					refetchBalances={refetch}
				/>
			</Show>
		</div>
	)
}

export default Dashboard
