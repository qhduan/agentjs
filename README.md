# DONOT USE ME !!! DO NOT READ ME !!! YOU SEE NOTHING !!!


## BUILD

```
./build.sh
```

## RUN

```
docker run -it --rm -p 7890:7890 qhduan/agent_server

docker run -it --rm -e HOST='ws://xxx:xxx' -e PORT=2082 -e PASSWORD=xxx -p 1080:1080 qhduan/agent
```

然后可以配置一个自动代理：http://localhost:1080/autoproxy.pac
