import os

class Config:
    MONGO_URI = os.environ.get('MONGO_URI')
    _raw_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:4100,http://0.0.0.0:4100')
    CORS_ORIGIN_WHITELIST = [origin.strip() for origin in _raw_origins.split(',')]

class ProdConfig(Config):
    ENV = 'prod'
    DEBUG = False

class DevConfig(Config):
    ENV = 'dev'
    DEBUG = True
    #MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/webhookdb')

class TestConfig(Config):
    TESTING = True
    DEBUG = True
    # MONGO_URI = os.environ.get('MONGO_TEST_URI', 'mongodb://localhost:27017/testdb')