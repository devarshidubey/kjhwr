from flask.helpers import get_debug_flag
from conduit.app import create_app
from conduit.settings import ProdConfig, DevConfig

CONFIG = DevConfig if get_debug_flag() else ProdConfig

app = create_app(CONFIG)