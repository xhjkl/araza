import { PublicKey } from '@solana/web3.js'
import {
	createResource,
	createSignal,
	Suspense,
	Show,
	type Accessor,
} from 'solid-js'

import { getAllBalances } from './getBalances'
import {
	deposit,
	offerDd,
	offerFiat,
	redeem,
	untilFinalized,
} from './transactions'

const Actions = (args: {
	publicKey: string
	pendingTx: Accessor<string | null>
	setPendingTx: (tx: string | null) => void
	refetchBalances: () => void
}) => {
	/** Lock the interface for the duration of `action`. */
	const doAndWait = async (action: () => Promise<string | null>) => {
		const tx = await action()
		if (!tx) {
			return
		}
		args.setPendingTx(tx)
		await untilFinalized(tx)
		args.setPendingTx(null)
		args.refetchBalances()
	}
	return (
		<div class="card">
			<div class="button-container">
				<button
					type="button"
					onClick={async () => {
						await doAndWait(() =>
							deposit(new PublicKey(args.publicKey), 100_000000n),
						)
					}}
				>
					USDC → ĐĐ
				</button>
				<button
					type="button"
					onClick={async () => {
						await doAndWait(() =>
							redeem(new PublicKey(args.publicKey), 100_000000n),
						)
					}}
				>
					ĐĐ → USDC
				</button>
				<button
					type="button"
					onClick={async () => {
						await doAndWait(() =>
							offerDd(new PublicKey(args.publicKey), 100_000000n, '987654321'),
						)
					}}
				>
					ĐĐ → Fiat
				</button>
				<button
					type="button"
					onClick={async () => {
						await doAndWait(() =>
							offerFiat(
								new PublicKey(args.publicKey),
								100_000000n,
								'123456789',
							),
						)
					}}
				>
					Fiat → ĐĐ
				</button>
			</div>
		</div>
	)
}

const Balances = (args: {
	balances: { [key: string]: number }
	canRefresh: boolean
	onRefresh: () => void
}) => (
	<>
		<p class="ticker">
			<span>Your SOL balance is</span>
			<b>{args.balances.sol ?? 0.0}</b>
		</p>
		<p class="ticker">
			<span>Your USDC balance is</span>
			<b>{args.balances.usdc ?? 0.0}</b>
		</p>
		<p class="ticker">
			<span>Your ĐĐ balance is</span>
			<b>{args.balances.dd ?? 0.0}</b>
		</p>
		<Show when={(args.balances.ddEscrow ?? 0) > 0}>
			<p class="ticker">
				<span>Your ĐĐ offer is</span>
				<b>{args.balances.ddEscrow ?? 0.0}</b>
			</p>
		</Show>
		<Show when={args.canRefresh}>
			<button type="button" onClick={args.onRefresh}>
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
							balances={balances() ?? {}}
							canRefresh={pendingTx() == null}
							onRefresh={refetch}
						/>
					</Suspense>
				</div>
			</div>
			<Show
				when={pendingTx() == null}
				fallback={
					<p style={{ 'font-style': 'oblique' }}>
						Waiting for confirmation...
						<br />
						<code>{pendingTx()}</code>
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
			<Show when={(balances()?.ddEscrow ?? 0) > 0}>
				<a href="/?cabinet=[]">Cabinet</a>
			</Show>
		</div>
	)
}

export default Dashboard
