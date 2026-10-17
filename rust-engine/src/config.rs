use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub port: u16,
    pub api_key: String,
    pub firestore_project: String,
    pub gemini_api_key: String,
    pub gemini_model: String,
    pub window_max_accounts: u64,
    pub window_capacity: usize,
    pub write_budget_daily: u32,
    pub benchmark_mode: bool,
}

fn load_dotenv_if_exists() {
    let candidates = [".env", "../.env", "rust-engine/.env"];
    for path in candidates {
        if let Ok(contents) = std::fs::read_to_string(path) {
            for line in contents.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    continue;
                }
                if let Some((key, value)) = trimmed.split_once('=') {
                    let key = key.trim();
                    let val = value.trim().trim_matches('"').trim_matches('\'');
                    if env::var(key).is_err() && !val.is_empty() {
                        env::set_var(key, val);
                    }
                }
            }
            break;
        }
    }
}

impl AppConfig {
    pub fn from_env(benchmark_cli_flag: bool) -> Self {
        load_dotenv_if_exists();

        Self {
            port: env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080),
            api_key: env::var("SCORE_API_KEY").unwrap_or_else(|_| "aegis_sentinel_dev_key_2026".to_string()),
            firestore_project: env::var("FIRESTORE_PROJECT").unwrap_or_else(|_| "genai-track3-coffee".to_string()),
            gemini_api_key: env::var("GEMINI_API_KEY").unwrap_or_default(),
            gemini_model: env::var("GEMINI_MODEL").unwrap_or_else(|_| "gemini-3.8-flash".to_string()),
            window_max_accounts: env::var("WINDOW_MAX_ACCOUNTS").ok().and_then(|v| v.parse().ok()).unwrap_or(50000),
            window_capacity: env::var("WINDOW_CAPACITY").ok().and_then(|v| v.parse().ok()).unwrap_or(64),
            write_budget_daily: env::var("WRITE_BUDGET_DAILY").ok().and_then(|v| v.parse().ok()).unwrap_or(10000),
            benchmark_mode: benchmark_cli_flag || env::var("BENCHMARK_MODE").map(|v| v == "1" || v.to_lowercase() == "true").unwrap_or(false),
        }
    }
}
