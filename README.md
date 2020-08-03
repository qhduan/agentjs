# DONOT USE ME !!! DO NOT READ ME !!! YOU SEE NOTHING !!!


## BUILD

```
./build.sh
```

## RUN

```
docker run -it --rm --name=agent -p 7890:7890 qhduan/agent_server

docker run -it --rm --name=agent -e HOST='ws://xxx:xxx' -e PORT=1080 -e PASSWORD=xxx -p 1080:1080 -p 8118:8118 qhduan/agent
```

然后可以配置一个自动代理：http://localhost:1080/autoproxy.pac
