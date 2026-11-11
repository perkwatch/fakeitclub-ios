# Fake It Club — Capacitor shell project

The full game is bundled in `www/` (index.html + style.css + game.js) — a
complete, self-contained social deduction party game. Unlike the Town shell,
this app loads **no remote URL**: the game ships inside the binary and works
fully offline. No accounts, no servers, no purchases, no ads, no tracking.

- **App name, every surface:** exactly `Fake It Club`
- **appId:** `com.buckthem.fakeitclub`
- **Play:** 4–10 clubmates per round. Human players share the device
  pass-and-play; AI clubmates fill the remaining seats. Persistent clubhouse
  between rounds: levels, Club Coins, cosmetics, decor, and a Scenario
  Studio for player-made scenarios.
- **Build:** GitHub Actions workflow `build-fakeitclub.yml` in
  perkwatch/perkwatch-ios runs on the self-hosted iMac runner (manual
  signing, profile "Fake It Club App Store"). Committed
  CURRENT_PROJECT_VERSION base must equal the last uploaded TestFlight
  number; bookkeeping commits carry [skip ci].
