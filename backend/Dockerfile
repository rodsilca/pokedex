# --- Estágio 1: ---
#  imagem oficial do Python. A versão 'slim' é menor e otimizada.
FROM python:3.10-slim

# --- Configuração do Ambiente ---
# definição de diretório de trabalho dentro do container.
WORKDIR /app

# Impede que o Python gere arquivos .pyc e  grave no disco.
ENV PYTHONDONTWRITEBYTECODE 1
# Garantir que o output do Python seja enviado diretamente para o terminal, o que ajuda na depuracao.
ENV PYTHONUNBUFFERED 1

# --- Instalação de Dependências ---
# copiamos o arquivo de dependências primeiro.
# isso aproveita o cache do Docker: se o requirements.txt não mudar, o Docker não reinstalará tudo.
COPY requirements.txt .

# instalamos as dependências do projeto.
RUN pip install --no-cache-dir -r requirements.txt

# --- Cópia do Código da Aplicação ---
# agora, copiamos o resto do código da nossa API para o diretório de trabalho no container.
COPY . .

# --- Exposição da Porta ---
# informamos ao Docker que a aplicação dentro do container vai rodar na porta 5000.
EXPOSE 5000

# --- Comando de Inicialização ---
# Este é o comando que será executado quando o container iniciar.
# Usamos o Gunicorn, que é um servidor WSGI mais robusto para produção do que o servidor de desenvolvimento do Flask.
CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
