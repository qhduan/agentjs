FROM node:10
LABEL maintainer="mail@qhduan.com"
RUN git clone https://github.com/qhduan/agentjs.git
WORKDIR /home/node/agentjs
RUN npm i
CMD node client.js

