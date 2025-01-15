import { Router, Route, Navigate } from '@solidjs/router'

import Main from './Main'
import Cabinet from './Cabinet'

import './App.css'

function App() {
	return (
		<Router>
			<Route path="/" component={Main} />
			<Route path="/cabinet" component={Cabinet} />
			<Route path="*" component={() => <Navigate href="/" />} />
		</Router>
	)
}

export default App
