import { mount } from 'svelte'
import './app.css'
import '@fontsource/oswald/400.css'
import '@fontsource/oswald/500.css'
import '@fontsource/oswald/600.css'
import '@fontsource/oswald/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/rock-salt'
import '@fontsource/fredoka-one'
import App from './App.svelte'
import { initSessionFromQuery } from './game/session.js'
import { bootstrapStakeSession } from './game/bootstrap.js'

initSessionFromQuery()
bootstrapStakeSession()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
