# DONOT USE ME !!! DO NOT READ ME !!! YOU SEE NOTHING !!!


## BUILD

```
./build.sh
```

## RUN

```
docker run -d --name=agent -e HOST="ws://xxx:9002" -e PASSWORD=xxx -p 1080:1080 qhduan/agent
```

然后可以配置一个自动代理：http://localhost:1080/autoproxy.pac
