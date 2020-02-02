FROM node:10
RUN mkdir -p /root/agent
COPY ./* /root/agent/
WORKDIR /root/agent
RUN npm i
CMD node client.js
