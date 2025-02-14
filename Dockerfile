# Imagen base de Node.js
FROM node:18

# Configurar el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json ./

# Instalar dependencias de forma limpia
RUN npm ci 

# Instalar ts-node-dev globalmente (si es necesario)
RUN npm install -g ts-node-dev

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto 3001
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]
