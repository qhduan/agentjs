FROM node:10
RUN mkdir -p /root/agent
COPY ./* /root/agent/
WORKDIR /root/agent
RUN npm config set registry https://registry.npm.taobao.org
RUN npm i
RUN npm install -g http-proxy-to-socks
CMD node client.js
