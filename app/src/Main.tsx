import { Match, Switch } from 'solid-js'

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
