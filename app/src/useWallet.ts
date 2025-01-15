import { createSignal } from 'solid-js'

/** A hook to manage the wallet and public key. */
const useWallet = () => {
	const initialWallet = self.phantom?.solana ?? null
	const initialPublicKey = initialWallet?.publicKey?.toString() ?? null
	const [wallet, setWallet] = createSignal(initialWallet as unknown)
	const [publicKey, setPublicKey] = createSignal(
		initialPublicKey as string | null,
	)

	const connect = async () => {
		const phantom = self.phantom
		if (!phantom) {
			return
		}
		// biome-ignore lint/style/noNonNullAssertion: guaranteed to be there
		const response = await phantom.solana!.connect()
		setWallet(phantom)
		setPublicKey(response.publicKey.toString())
		// biome-ignore lint/style/noNonNullAssertion: checked above
		phantom.solana!.on('disconnect', () => {
			setWallet(null)
			setPublicKey(null)
		})
	}

	const disconnect = async () => {
		if (self.phantom) {
			// biome-ignore lint/style/noNonNullAssertion: guaranteed to be there
			await self.phantom.solana!.disconnect()
			setWallet(null)
			setPublicKey(null)
		}
	}

	return {
		wallet,
		publicKey,
		connect,
		disconnect,
	}
}

export default useWallet
