# --- Estágio 1: Base ---
# Começamos com uma imagem oficial do Python. A versão 'slim' é menor e otimizada.
FROM python:3.10-slim

# --- Configuração do Ambiente ---
# Definimos o diretório de trabalho dentro do contêiner.
WORKDIR /app

# Impedimos que o Python gere arquivos .pyc e os grave no disco.
ENV PYTHONDONTWRITEBYTECODE 1
# Garantimos que o output do Python seja enviado diretamente para o terminal, o que ajuda na depuração.
ENV PYTHONUNBUFFERED 1

# --- Instalação de Dependências ---
# Copiamos o arquivo de dependências primeiro.
# Isso aproveita o cache do Docker: se o requirements.txt não mudar, o Docker não reinstalará tudo.
COPY requirements.txt .

# Instalamos as dependências do projeto.
RUN pip install --no-cache-dir -r requirements.txt

# --- Cópia do Código da Aplicação ---
# Agora, copiamos o resto do código da nossa API para o diretório de trabalho no contêiner.
COPY . .

# --- Exposição da Porta ---
# Informamos ao Docker que a aplicação dentro do contêiner vai rodar na porta 5000.
EXPOSE 5000

# --- Comando de Inicialização ---
# Este é o comando que será executado quando o contêiner iniciar.
# Usamos o Gunicorn, que é um servidor WSGI mais robusto para produção do que o servidor de desenvolvimento do Flask.
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
