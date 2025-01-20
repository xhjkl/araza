import { createResource } from 'solid-js'

const c2cTransferSent = `\
# Date,Description,Amount,Account,Transaction ID
2025-01-04,Online Shopping,-75.0,123456789,TXN004
2025-01-05,Restaurant,-40.0,123456789,TXN005
2025-01-06,C2C Transfer to 987654321,-200.0,123456789,TXN006
`

const c2cTransferReceived = `\
# Date,Description,Amount,Account,Transaction ID
2025-01-06,C2C Transfer from 123456789,200.0,987654321,TXN006
2025-01-07,Coffee Shop,-10.0,987654321,TXN007
2025-01-08,Taxi,-25.0,987654321,TXN008
`

const irrelevantTransactions = `\
# Date,Description,Amount,Account,Transaction ID
2025-01-01,Restaurant,-50.0,123456789,TXN001
2025-01-02,Gas Station,-30.0,123456789,TXN002
2025-01-03,Groceries,-120.0,123456789,TXN003
`

const getAllOffers = async () => {
	const response = await fetch('/offer')
	return response.json()
}

const submitBankStatement = async (statement: string) =>
	fetch('/readout', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/csv',
		},
		body: statement,
	})

const Cabinet = () => {
	const [offers, { refetch }] = createResource(async () => await getAllOffers())

	let textarea!: HTMLTextAreaElement

	return (
		<div>
			<h1>Admin Page</h1>
			<p>Let's pretend this is an admin page.</p>
			<p>
				Here you can see the details of all the offers from all users, as well
				as submit the bank statements as if received from the bank by webhooks.
			</p>
			<p>
				For now, the seller's account is always:
				<br />
				<code>987654321</code>
				<br />
				and the buyer's account is always:
				<br />
				<code>123456789</code>
				<br />
				And the amount is always one hundred.
			</p>
			<p>
				Here is the list of all the active offers:
				<br />
				<code>{JSON.stringify(offers(), null, 2)}</code>
			</p>
			<button
				type="button"
				onClick={() => {
					refetch()
				}}
			>
				Refresh
			</button>
			<p>And here you can submit the statements:</p>
			<p>
				<textarea
					style={{ 'min-width': '420px', 'min-height': '200px' }}
					ref={textarea}
				/>
			</p>
			<button
				type="button"
				onClick={() => {
					submitBankStatement(textarea.value)
				}}
			>
				Submit
			</button>
			<p>Useful templates to choose from:</p>
			<button
				type="button"
				onClick={() => {
					textarea.value = irrelevantTransactions
				}}
			>
				Irrelevant transactions
			</button>
			<button
				type="button"
				onClick={() => {
					textarea.value = c2cTransferSent
				}}
			>
				C2C transfer sent
			</button>
			<button
				type="button"
				onClick={() => {
					textarea.value = c2cTransferReceived
				}}
			>
				C2C transfer received
			</button>
		</div>
	)
}

export default Cabinet
