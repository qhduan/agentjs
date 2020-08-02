#!/bin/bash

set - e

docker build -t qhduan/agent .
docker build -t qhduan/agent_server -f Dockerfile_server .

docker push qhduan/agent
docker push qhduan/agent_server
