"""
The job description, encoded as a structured rubric.

This module IS our "deep job understanding". Every weight, keyword set and
threshold below is derived directly from the released JD for the
"Senior AI Engineer - Founding Team" role at Redrob, including its explicit
"things we do NOT want" section and the hackathon note about traps.

Keeping this in one auditable place means a reviewer can read exactly what the
system believes the role rewards and penalises - no hidden magic.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Free-text description of the role, used for the semantic (TF-IDF / dense)
# similarity component. This is a distilled version of the JD that emphasises
# what the JD says it *means*, not just its keywords.
# ---------------------------------------------------------------------------
JD_QUERY_TEXT = """
Senior AI Engineer for a founding team at an AI-native talent intelligence
platform. Owns the intelligence layer: ranking, retrieval and matching systems
that decide what recruiters see. Production experience with embeddings-based
retrieval (sentence-transformers, BGE, E5, OpenAI embeddings), vector databases
and hybrid search (FAISS, Pinecone, Weaviate, Qdrant, Milvus, OpenSearch,
Elasticsearch). Strong Python and code quality. Designs evaluation frameworks
for ranking systems: NDCG, MRR, MAP, offline-to-online correlation, A/B testing.
Has shipped end-to-end ranking, search or recommendation systems to real users
at scale at product companies. Understands information retrieval and learning to
rank. Scrappy product engineer who ships, not a pure researcher. Applied machine
learning, NLP, large language models, fine-tuning LoRA QLoRA PEFT, semantic
search, re-ranking, recommendation systems, personalization, relevance.
""".strip()

# ---------------------------------------------------------------------------
# Core technical skills the JD treats as decisive ("things you absolutely
# need"). Matched against candidate skills AND career-history descriptions.
# Weighted higher than "nice to have".
# ---------------------------------------------------------------------------
MUST_HAVE_SKILLS = {
    "embeddings", "sentence-transformers", "sentence transformers", "bge", "e5",
    "vector search", "vector database", "vector db", "semantic search",
    "faiss", "pinecone", "weaviate", "qdrant", "milvus", "opensearch",
    "elasticsearch", "hybrid search", "retrieval", "information retrieval",
    "learning to rank", "ranking", "re-ranking", "reranking",
    "recommendation", "recommender", "recsys", "personalization",
    "ndcg", "mrr", "map", "evaluation", "relevance", "bm25",
    "python", "nlp", "natural language processing",
}

NICE_TO_HAVE_SKILLS = {
    "lora", "qlora", "peft", "fine-tuning", "fine tuning", "llm", "llms",
    "large language models", "xgboost", "learning-to-rank", "transformers",
    "rag", "retrieval augmented generation", "pytorch", "tensorflow",
    "huggingface", "hugging face", "distributed systems", "spark",
    "inference optimization", "a/b testing", "ab testing", "open source",
}

# Generic engineering-adjacent terms - presence is mildly positive but never
# decisive; prevents over-rewarding buzzword lists.
SUPPORTING_SKILLS = {
    "machine learning", "deep learning", "data science", "sql", "airflow",
    "docker", "kubernetes", "aws", "gcp", "azure", "mlops", "pandas", "numpy",
    "scikit-learn", "api", "microservices", "backend",
}

# ---------------------------------------------------------------------------
# Title evidence. The JD's single sharpest trap: "a candidate who has all the
# AI keywords listed as skills but whose title is 'Marketing Manager' is not a
# fit". So title is a gate, not a feature.
# ---------------------------------------------------------------------------
STRONG_TITLE_TERMS = {
    "machine learning engineer", "ml engineer", "ai engineer",
    "applied scientist", "applied ml", "research engineer", "nlp engineer",
    "search engineer", "ranking engineer", "relevance engineer",
    "recommendation engineer", "data scientist", "ml scientist",
    "staff engineer", "staff machine learning", "principal engineer",
    "machine learning scientist", "ai/ml", "deep learning engineer",
    "search relevance", "personalization engineer",
}

# Software roles that can plausibly have built ranking/search systems - count,
# but less than an explicit ML title.
MODERATE_TITLE_TERMS = {
    "software engineer", "senior software engineer", "backend engineer",
    "data engineer", "platform engineer", "sde", "software developer",
    "full stack", "fullstack", "engineering", "developer",
}

# Titles that signal the candidate is NOT an individual-contributor engineer.
# The JD explicitly rejects keyword-stuffers in non-engineering roles and
# "architect/tech lead who hasn't written code in 18 months".
NON_IC_OR_OFFTRACK_TITLES = {
    "marketing manager", "marketing", "hr manager", "human resources",
    "recruiter", "talent acquisition", "sales", "account manager",
    "business development", "content writer", "copywriter", "designer",
    "ux designer", "ui designer", "product manager", "project manager",
    "program manager", "operations manager", "customer success",
    "finance", "accountant", "consultant", "qa tester", "support engineer",
}

# Pure-research signal: the JD will NOT move forward on "pure research
# environments without any production deployment".
RESEARCH_ONLY_TITLES = {
    "research scientist", "research fellow", "postdoc", "post-doc",
    "phd researcher", "academic", "professor", "lecturer", "research assistant",
}

# ---------------------------------------------------------------------------
# Company classification. The JD wants "product companies (not pure services)"
# and explicitly rejects careers spent entirely at consulting/services firms.
# ---------------------------------------------------------------------------
CONSULTING_SERVICES_FIRMS = {
    "tcs", "tata consultancy", "infosys", "wipro", "accenture", "cognizant",
    "capgemini", "hcl", "tech mahindra", "lti", "larsen", "mindtree",
    "ltimindtree", "mphasis", "hexaware", "birlasoft", " ibm ", "deloitte",
    "pwc", "kpmg", "ernst", "genpact", "wns", "concentrix", "dxc",
}

# A non-exhaustive set of recognisable product / tech companies. Membership is
# a mild positive ("shipped at a product company"); absence is neutral, not a
# penalty (we don't have a full company graph).
PRODUCT_TECH_FIRMS = {
    "google", "meta", "facebook", "amazon", "microsoft", "apple", "netflix",
    "uber", "airbnb", "linkedin", "spotify", "stripe", "flipkart", "swiggy",
    "zomato", "razorpay", "phonepe", "cred", "meesho", "ola", "myntra",
    "paytm", "freshworks", "zoho", "postman", "browserstack", "druva",
    "nvidia", "openai", "anthropic", "cohere", "databricks", "snowflake",
    "atlassian", "salesforce", "adobe", "intuit", "shopify", "pinterest",
    "twitter", "dropbox", "instacart", "doordash", "walmart labs", "sprinklr",
    "nutanix", "hasura", "rubrik", "gojek", "grab", "sharechat", "dunzo",
}

# ---------------------------------------------------------------------------
# Location. JD: Pune/Noida preferred; Tier-1 Indian cities welcome; outside
# India case-by-case with no visa sponsorship. Relocation willingness matters.
# ---------------------------------------------------------------------------
PREFERRED_LOCATIONS = {"pune", "noida"}
TIER1_INDIA_LOCATIONS = {
    "bangalore", "bengaluru", "hyderabad", "mumbai", "delhi", "new delhi",
    "gurgaon", "gurugram", "ncr", "chennai", "kolkata", "ahmedabad",
}
INDIA_COUNTRY_NAMES = {"india", "in"}

# ---------------------------------------------------------------------------
# Component weights for the base (skills + role) relevance score. They sum to
# 1.0 so the base score is naturally in [0, 1] before modifiers.
# ---------------------------------------------------------------------------
BASE_WEIGHTS = {
    "semantic": 0.26,      # TF-IDF / dense similarity to the JD
    "role_fit": 0.24,      # title + career evidence of real ML/eng work
    "skill_trust": 0.20,   # trusted (endorsed + used) core-skill match
    "experience": 0.12,    # years band + recency of hands-on code
    "company": 0.10,       # product vs services/consulting
    "location": 0.05,      # geo fit / relocation
    "education": 0.03,     # institution tier (minor)
}

# Experience band. The JD calls 5-9 a soft range with an ideal of 6-8.
EXP_IDEAL_LOW, EXP_IDEAL_HIGH = 6.0, 8.0
EXP_OK_LOW, EXP_OK_HIGH = 5.0, 9.0

# Disqualifier penalties are *multiplicative* (1.0 = no penalty). They model
# the JD's "we will probably not move forward" language as strong down-weights
# rather than hard zeros, except honeypots which are handled in integrity.py.
PENALTY = {
    "non_ic_title": 0.45,        # current title is non-engineering / off-track
    "consulting_only": 0.55,     # entire career at services/consulting firms
    "research_only": 0.60,       # pure research, no product deployment
    "title_chaser": 0.80,        # avg tenure < ~18 months across many jobs
    "cv_speech_only": 0.65,      # CV/speech/robotics without NLP/IR
    "langchain_only_junior": 0.70,  # <3 yrs, LangChain/prompt-only, no real ML
    "stale_code": 0.80,          # senior but no IC/hands-on role in 18+ months
}

# Behavioural availability modifier bounds. The JD: "a perfect-on-paper
# candidate who hasn't logged in for 6 months ... is not actually available.
# Down-weight them appropriately." We keep it a modifier, not a primary score.
AVAIL_MIN, AVAIL_MAX = 0.40, 1.10

# Today's reference date for recency math. Pinned for determinism /
# reproducibility (the dataset is a fixed synthetic snapshot, mid-2026).
REFERENCE_DATE = "2026-06-24"
