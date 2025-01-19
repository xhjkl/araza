import { Match, Switch } from 'solid-js'
import type { PublicKey } from '@solana/web3.js'

import useWallet from './useWallet'

import Dashboard from './Dashboard'
import Welcome from './Welcome'

const Main = () => {
	const { publicKey, connect } = useWallet()

	return (
		<Switch>
			<Match when={publicKey() != null}>
				<Dashboard
					publicKey={
						// biome-ignore lint/style/noNonNullAssertion: checked in the Switch
						publicKey()!
					}
				/>
			</Match>
			<Match when={publicKey() == null}>
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
		toBase58: () => string
	}

	interface Phantom {
		isPhantom: boolean
		publicKey: StringConvertible
		connect: () => Promise<{ publicKey: StringConvertible }>
		disconnect: () => Promise<void>
		signMessage: (
			message: Uint8Array,
		) => Promise<{ publicKey: PublicKey; signature: Uint8Array }>
		signTransaction: (transaction: unknown) => Promise<Serializable>
		signAndSendTransaction: (transaction: unknown) => Promise<Serializable>
		on: (event: string, callback: () => void) => void
	}

	interface Window {
		phantom?: { solana?: Phantom }
	}
}

export default Main
