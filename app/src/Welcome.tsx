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

export default Welcome
