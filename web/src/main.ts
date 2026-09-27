import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { reveal } from './lib/reveal'

import './styles/tokens.css'
import './styles/textures.css'
import './styles/neon.css'
import './styles/base.css'

createApp(App).use(router).directive('reveal', reveal).mount('#app')
