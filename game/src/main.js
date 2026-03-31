import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initSessionFromQuery } from './game/session.js'
import { bootstrapStakeSession } from './game/bootstrap.js'

initSessionFromQuery()
bootstrapStakeSession()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
