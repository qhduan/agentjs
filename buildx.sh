#!/bin/bash

# build with multiple platform

# https://www.docker.com/blog/getting-started-with-docker-for-arm-on-linux/
# $ docker buildx create --name mybuilder
# $ docker buildx use mybuilder
# $ docker buildx inspect --bootstrap

# https://github.com/docker/buildx/issues/495#issuecomment-761562905
# docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
# docker buildx create --name multiarch --driver docker-container --use
# docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t qhduan/agent --push .
