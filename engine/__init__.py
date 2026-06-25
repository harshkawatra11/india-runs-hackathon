"""
india-runs-hackathon ranking engine.

A deterministic, CPU-only, network-free candidate ranker for the Redrob
"Intelligent Candidate Discovery & Ranking" challenge.

The pipeline is intentionally transparent and explainable:

    rubric  -> the JD encoded as structured weights, keyword sets and rules
    features-> per-candidate evidence extraction (title, career, skills, ...)
    integrity-> honeypot / impossible-profile detection
    signals -> behavioural availability modifier
    score   -> composition of the above into a single (0, 1] score
    reason  -> fact-grounded, varied, rank-consistent justification text
    rank    -> streaming CLI that emits a spec-exact top-100 CSV

Nothing here calls a hosted LLM or the network at ranking time.
"""

__version__ = "1.0.0"
