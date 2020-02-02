FROM node:10
<<<<<<< HEAD
RUN mkdir -p /root/agent
COPY ./* /root/agent/
WORKDIR /root/agent
RUN npm i
CMD node client.js
