
# docker run -it --rm --name=quic-client -e SERVER_HOST=172.20.10.9 -p 2080:2080 -v $PWD:/playground nwtgck/node-quic bash -c 'cd /playground && node quicClient.js'

docker run -it --rm --name=quic-client -e SERVER_HOST=172.20.10.9 -p 2080:2080 qhduan/quic_agent_client
