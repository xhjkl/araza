import { Show } from 'solid-js'
import { Router, Route, Navigate, useSearchParams } from '@solidjs/router'

import Main from './Main'
import Cabinet from './Cabinet'

import './App.css'

const MainOrCabinet = () => {
	const [searchParams] = useSearchParams()
	return (
		<Show when={searchParams.cabinet} fallback={<Main />}>
			<Cabinet />
		</Show>
	)
}

function App() {
	return (
		<Router>
			<Route path="/" component={MainOrCabinet} />
			<Route path="*" component={() => <Navigate href="/" />} />
		</Router>
	)
}

export default App
