#docker build --platform linux/amd64 -t ariastestapi:1.0.0 -f Dockerfile .
FROM node:16
RUN npm install -g npm@9.6.6
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
ENV PATH /usr/src/node_modules/.bin:$PATH
COPY . .
EXPOSE 8081
