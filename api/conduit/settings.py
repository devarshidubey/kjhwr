import os

class Config:
    CORS_ORIGIN_WHITELIST = [
        o.strip()
        for o in os.environ.get(
            "CORS_ORIGIN_WHITELIST",
            "http://localhost:3000,http://localhost:5173",
        ).split(",")
        if o.strip()
    ]

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