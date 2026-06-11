import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

if not os.environ.get("GOOGLE_API_KEY"):
    os.environ.pop("GOOGLE_API_KEY", None)


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "vigil"
    fivetran_api_key: str = ""
    fivetran_api_secret: str = ""
    fivetran_allow_writes: bool = True
    google_api_key: str = ""
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    scheduler_interval_seconds: int = 300
    sse_heartbeat_seconds: int = 15
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
