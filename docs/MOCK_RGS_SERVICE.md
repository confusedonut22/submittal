# Local Mock RGS Service

This repo now includes a local authoritative mock RGS so the frontend can run
against backend-owned round state instead of only local gameplay state.

Files:

- [authoritative_blackjack.py](authoritative_blackjack.py)
- [backend_config.py](backend_config.py)
- [mock_rgs_server.py](mock_rgs_server.py)

## what it does

The mock service currently supports:

- `GET /health`
- `POST /wallet/authenticate`
- `POST /wallet/balance`
- `POST /wallet/play`
- `POST /bet/event`
- `POST /wallet/end-round`
- `POST /replay/event`

It owns:

- session balance
- active round creation
- per-hand bets and side bets
- insurance
- hit / stand / double / split
- split aces (locked to one card each, no resplit, no double after split)
- dealer play
- final settlement
- returned `round.state`
- replay fetch for completed rounds by event or bet ID

## current limitations

This is a local integration scaffold, not a final Stake backend.

Known limitations:

- persistence is local JSON scaffolding, not production session storage
- no production auth
- frontend and backend still share a draft blackjack `round.state` contract
- double after split (DAS) is not allowed by design

## how to run it

From the top-level repo:

```bash
python3 mock_rgs_server.py
```

It listens on:

```text
http://127.0.0.1:8787
```

You can override startup config with env vars:

```bash
MOCK_RGS_HOST=127.0.0.1
MOCK_RGS_PORT=8787
MOCK_RGS_STORAGE=mock_rgs_state.json
MOCK_RGS_SEED=1337
```

## how to run the frontend against it

Start the Svelte app as usual:

```bash
cd game
npm install
npm run dev
```

Then open the app with Stake-style query params, for example:

```text
http://127.0.0.1:5173/?sessionID=local-dev-session&lang=en&device=desktop&rgs_url=http://127.0.0.1:8787
```

You can also use Vite env defaults instead of typing the whole query string on
every run:

```bash
cd game
VITE_STAKE_SESSION_ID=local-dev-session \
VITE_STAKE_RGS_URL=http://127.0.0.1:8787 \
npm run dev
```

Query params still override the env defaults when both are present.

## expected behavior

- `Authenticate` seeds balance and config
- `Play` now creates an authoritative round using frontend hand configs
- the frontend hydrates the backend-returned `round.state`
- `Event` advances the backend-owned round
- `EndRound` closes the round and updates balance
- completed rounds can be fetched again through `/replay/event`

## replay example

After a completed round has been closed, use its `betID` as the replay `event`
query param:

```text
http://127.0.0.1:5173/?sessionID=local-dev-session&lang=en&device=desktop&rgs_url=http://127.0.0.1:8787&replay=true&mode=replay&event=1
```

## why this matters

This moves the project past the earlier blocker where:

- round outcome authority was still local
- resume only worked against frontend-owned draft state

It does not finish Stake integration, but it gives the repo a real local
authoritative round owner to continue building against.
