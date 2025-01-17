import { createSignal, createMemo } from 'solid-js'

/** A hook to manage the wallet and public key. */
const useWallet = () => {
	const [wallet, setWallet] = createSignal(
		self.phantom?.solana ?? null,
		// Every `setWallet` call should trigger a refresh of its dependents,
		// so we don't want to compare the wallet object by reference.
		{
			equals: false,
		},
	)
	const publicKey = createMemo(() => wallet()?.publicKey?.toString() ?? null)

	const connect = async () => {
		if (!self.phantom) {
			return
		}
		await self.phantom.solana?.connect()
		setWallet(self.phantom?.solana ?? null)
		self.phantom.solana?.on('disconnect', () => {
			setWallet(null)
		})
	}

	const disconnect = async () => {
		if (self.phantom) {
			await self.phantom.solana?.disconnect()
			setWallet(null)
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
