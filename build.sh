#!/bin/bash

set -e
docker build -t qhduan/quic_agent_server -f Dockerfile_server .
docker build -t qhduan/quic_agent_client -f Dockerfile_client .
# docker push qhduan/agent
