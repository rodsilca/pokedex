from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, bcrypt
from routes import auth_routes, pokemon_routes, user_routes

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    bcrypt.init_app(app)

    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(pokemon_routes.bp)
    app.register_blueprint(user_routes.bp)

    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)

