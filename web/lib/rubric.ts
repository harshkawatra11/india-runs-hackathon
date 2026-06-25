// The JD encoded as a rubric — a faithful TypeScript mirror of engine/rubric.py.
// Kept in sync with the Python engine so the in-browser sandbox reasons the same
// way the scored ranker does.

export const JD_QUERY_TEXT = `Senior AI Engineer founding team AI-native talent
intelligence platform. Owns intelligence layer ranking retrieval matching.
Production embeddings-based retrieval sentence-transformers BGE E5 vector
databases hybrid search FAISS Pinecone Weaviate Qdrant Milvus OpenSearch
Elasticsearch. Strong Python. Evaluation frameworks ranking NDCG MRR MAP
offline-to-online A/B testing. Shipped end-to-end ranking search recommendation
systems real users scale product companies. Information retrieval learning to
rank. Scrappy product engineer ships not pure researcher. Applied machine
learning NLP large language models fine-tuning LoRA QLoRA PEFT semantic search
re-ranking recommendation personalization relevance.`.toLowerCase();

export const MUST_HAVE_SKILLS = new Set([
  "embeddings", "sentence-transformers", "sentence transformers", "bge", "e5",
  "vector search", "vector database", "vector db", "semantic search",
  "faiss", "pinecone", "weaviate", "qdrant", "milvus", "opensearch",
  "elasticsearch", "hybrid search", "retrieval", "information retrieval",
  "learning to rank", "ranking", "re-ranking", "reranking",
  "recommendation", "recommender", "recsys", "personalization",
  "ndcg", "mrr", "map", "evaluation", "relevance", "bm25",
  "python", "nlp", "natural language processing",
]);

export const NICE_TO_HAVE_SKILLS = new Set([
  "lora", "qlora", "peft", "fine-tuning", "fine tuning", "llm", "llms",
  "large language models", "xgboost", "learning-to-rank", "transformers",
  "rag", "retrieval augmented generation", "pytorch", "tensorflow",
  "huggingface", "hugging face", "distributed systems", "spark",
  "inference optimization", "a/b testing", "ab testing", "open source",
]);

export const SUPPORTING_SKILLS = new Set([
  "machine learning", "deep learning", "data science", "sql", "airflow",
  "docker", "kubernetes", "aws", "gcp", "azure", "mlops", "pandas", "numpy",
  "scikit-learn", "api", "microservices", "backend",
]);

export const STRONG_TITLE_TERMS = [
  "machine learning engineer", "ml engineer", "ai engineer", "applied scientist",
  "applied ml", "research engineer", "nlp engineer", "search engineer",
  "ranking engineer", "relevance engineer", "recommendation engineer",
  "data scientist", "ml scientist", "staff engineer", "staff machine learning",
  "principal engineer", "machine learning scientist", "ai/ml",
  "deep learning engineer", "search relevance", "personalization engineer",
];

export const MODERATE_TITLE_TERMS = [
  "software engineer", "senior software engineer", "backend engineer",
  "data engineer", "platform engineer", "sde", "software developer",
  "full stack", "fullstack", "engineering", "developer",
];

export const NON_IC_OR_OFFTRACK_TITLES = [
  "marketing manager", "marketing", "hr manager", "human resources", "recruiter",
  "talent acquisition", "sales", "account manager", "business development",
  "content writer", "copywriter", "designer", "ux designer", "ui designer",
  "product manager", "project manager", "program manager", "operations manager",
  "customer success", "finance", "accountant", "consultant", "qa tester",
  "support engineer",
];

export const RESEARCH_ONLY_TITLES = [
  "research scientist", "research fellow", "postdoc", "post-doc",
  "phd researcher", "academic", "professor", "lecturer", "research assistant",
];

export const CONSULTING_SERVICES_FIRMS = [
  "tcs", "tata consultancy", "infosys", "wipro", "accenture", "cognizant",
  "capgemini", "hcl", "tech mahindra", "lti", "larsen", "mindtree",
  "ltimindtree", "mphasis", "hexaware", "birlasoft", " ibm ", "deloitte",
  "pwc", "kpmg", "ernst", "genpact", "wns", "concentrix", "dxc",
];

export const PRODUCT_TECH_FIRMS = [
  "google", "meta", "facebook", "amazon", "microsoft", "apple", "netflix",
  "uber", "airbnb", "linkedin", "spotify", "stripe", "flipkart", "swiggy",
  "zomato", "razorpay", "phonepe", "cred", "meesho", "ola", "myntra", "paytm",
  "freshworks", "zoho", "postman", "browserstack", "druva", "nvidia", "openai",
  "anthropic", "cohere", "databricks", "snowflake", "atlassian", "salesforce",
  "adobe", "intuit", "shopify", "pinterest", "twitter", "dropbox", "sprinklr",
];

export const PREFERRED_LOCATIONS = ["pune", "noida"];
export const TIER1_INDIA_LOCATIONS = [
  "bangalore", "bengaluru", "hyderabad", "mumbai", "delhi", "new delhi",
  "gurgaon", "gurugram", "ncr", "chennai", "kolkata", "ahmedabad",
];

export const BASE_WEIGHTS: Record<string, number> = {
  semantic: 0.26, role_fit: 0.24, skill_trust: 0.2, experience: 0.12,
  company: 0.1, location: 0.05, education: 0.03,
};

export const PENALTY = {
  non_ic_title: 0.45, consulting_only: 0.55, research_only: 0.6,
  title_chaser: 0.8, cv_speech_only: 0.65, langchain_only_junior: 0.7,
  stale_code: 0.8,
};

export const AVAIL_MIN = 0.4;
export const AVAIL_MAX = 1.1;
export const REFERENCE_DATE = "2026-06-24";
export const EXP_IDEAL_LOW = 6.0;
export const EXP_IDEAL_HIGH = 8.0;
export const EXP_OK_LOW = 5.0;
export const EXP_OK_HIGH = 9.0;
