FROM node:10

LABEL maintainer="mail@qhduan.com"

RUN apt-get update
RUN apt-get install -y git
RUN git clone https://github.com/qhduan/agentjs.git
WORKDIR /home/node/agentjs
RUN npm i
CMD node client.js

