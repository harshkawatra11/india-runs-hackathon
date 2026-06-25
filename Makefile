# Convenience targets. CANDIDATES defaults to the bundled pool path; override
# with `make rank CANDIDATES=/path/to/candidates.jsonl`.

CANDIDATES ?= ./candidates.jsonl
OUT ?= submission.csv
EMBEDDINGS ?= artifacts/dense_embeddings.npy

.PHONY: install test rank rank-dense validate precompute deck web clean

install:
	python -m pip install -r requirements.txt

dev-install:
	python -m pip install -r requirements-dev.txt

test:
	python -m pytest -q

# Reproduce the submission CSV (lexical + LSA; no network, < 5 min CPU).
rank:
	python -m engine.rank --candidates "$(CANDIDATES)" --out "$(OUT)"

# Reproduce using the optional precomputed dense embeddings, if present.
rank-dense:
	python -m engine.rank --candidates "$(CANDIDATES)" --out "$(OUT)" \
		--embeddings "$(EMBEDDINGS)" --dense-weight 0.5

# Optional, offline, may exceed 5 min — produces artifacts/dense_embeddings.npy
precompute:
	python scripts/precompute_embeddings.py --candidates "$(CANDIDATES)" --out "$(EMBEDDINGS)"

validate:
	python "[PUB] India_runs_data_and_ai_challenge/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/validate_submission.py" "$(OUT)"

deck:
	python scripts/build_deck.py

web:
	cd web && npm install && npm run dev

clean:
	rm -rf __pycache__ engine/__pycache__ engine/tests/__pycache__ .pytest_cache
