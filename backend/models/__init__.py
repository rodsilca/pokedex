from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

from models.tipo_model import TipoPokemon
from models.user_model import Usuario
from models.pokemon_model import pokemon_tipo_association, PokemonUsuario