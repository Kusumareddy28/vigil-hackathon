from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vigil"
    fivetran_api_key: str = ""
    fivetran_api_secret: str = ""
    fivetran_allow_writes: bool = True
    google_api_key: str = ""
    scheduler_interval_seconds: int = 300
    sse_heartbeat_seconds: int = 15
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
