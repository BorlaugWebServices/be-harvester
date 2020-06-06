FROM node:11.6.0

COPY . /home/be-harvester

WORKDIR "/home/be-harvester"

RUN npm install --silent
RUN npm run build

EXPOSE 6000

CMD [ "npm","start" ]