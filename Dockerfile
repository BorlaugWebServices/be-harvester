FROM node:16.14.2

COPY . /home/be-harvester

WORKDIR "/home/be-harvester"

RUN npm install --silent
RUN npm run build

EXPOSE 4000

CMD [ "npm","start" ]