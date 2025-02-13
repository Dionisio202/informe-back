# Imagen base de Node.js
FROM node:18

# Configurar el directorio de trabajo
WORKDIR /app

# Copiar los archivos de dependencias
COPY package.json package-lock.json ./
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto 3001
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]
