
# docker run -it --rm --name=quic-server -p 1234:1234/udp -v $PWD:/playground nwtgck/node-quic bash -c 'cd /playground && node quicServer.js'

docker run -it --rm --name=quic-server -p 1234:1234/udp qhduan/quic_agent_server
