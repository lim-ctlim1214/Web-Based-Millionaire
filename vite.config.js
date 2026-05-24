import { defineConfig } from 'vite'

export default defineConfig({
    publicDir: "assets",
    build: {
        rollupOptions: {
            input: {
                main:         'index.html',
                home:         'web/home.html',
                leaderboards: 'web/leaderboards.html',
                game:         'game/game.html',
            }
        }
    }
})