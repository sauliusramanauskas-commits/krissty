# Krissty 🍀 – Digital Creator

Promo site for Krissty ("Lifeis Short" on Facebook): live follower counter, milestone giveaway
(Ford Mustang GT 5.0 photo session + short ride at every 10,000 followers: 10000, 20000, 30000, …), LT/EN.

Live: https://sauliusramanauskas-commits.github.io/krissty/

- `index.html` – main page · `draw.html` – draw reveals (`?preview=1` also shows pending winners) · `stats.html` – visit/QR-scan counts
- `draws.json` – draw records · `draw.js` – run/confirm a draw · `next_prize.js` – next milestone / reached-but-undrawn check

```
node next_prize.js 10012                       # {"current":10012,"nextMilestone":20000,"reachedUndrawn":[10000]}
node draw.js --milestone 1000 --followers /workspace/fb-follower-watch/celebration/followers.jsonl --publish
node draw.js --confirm 1000 --publish
```

This promotion is in no way sponsored, endorsed, administered by, or associated with Facebook/Meta.
