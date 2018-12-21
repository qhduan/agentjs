FROM node:10
LABEL maintainer="mail@qhduan.com"
RUN apt-get update
RUN apt-get install -y unzip
USER node
WORKDIR /home/node/
RUN wget https://github.com/qhduan/agentjs/archive/master.zip
RUN unzip /home/node/master.zip
WORKDIR /home/node/agentjs-master
RUN npm i
CMD node client.js

