FROM node:16.13.0

COPY . /home/be-harvester

WORKDIR "/home/be-harvester"

RUN npm install --silent
RUN npm run build

EXPOSE 4000

CMD [ "npm","start" ]
