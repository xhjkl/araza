/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'

// biome-ignore lint/style/noNonNullAssertion: root always exists
const root = document.getElementById('root')!

render(() => <App />, root)
