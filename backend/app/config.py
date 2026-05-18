from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "CARE4ANIMALS API"
    
    # Database Configuration
    database_url: str = "postgresql+psycopg://care4animals:care4animals@localhost:5432/care4animals"
    
    # Frontend/CORS Configuration
    frontend_url: str = "*" # Default to allow all for easier setup, can be restricted in Render env

    
    # SMS Gateway Configuration (Issue #10)
    # These will be automatically populated from your .env file
    sms_provider: str = "textbee" # "africastalking" or "textbee"
    at_username: str = "sandbox"  # Default to sandbox for testing
    at_api_key: str = "change-me"
    
    # Textbee Configuration (cost-free Android SMS gateway alternative)
    textbee_api_key: str = "090b7569-08ea-477b-9563-d1e2b581b397"
    textbee_device_id: str = "6a0a86f89b9db0a6fefac9fa"
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    
    # Other Integrations
    rapidpro_secret: str = "change-me"
    
    # Pydantic configuration to load from .env
    model_config = SettingsConfigDict(
        env_file=".env", 
        extra="ignore",
        env_file_encoding='utf-8'
    )

settings = Settings()