FROM node:14
RUN apt-get update && apt-get install -y dialog apt-utils && apt-get -y install privoxy
RUN mkdir -p /root/agent
COPY ./* /root/agent/
WORKDIR /root/agent
RUN npm config set registry https://registry.npm.taobao.org
RUN npm i
COPY ./config /etc/privoxy/config
# CMD node client.js
CMD (service privoxy start || true) && node client.js
