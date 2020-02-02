# DONOT USE ME !!! DO NOT READ ME !!! YOU SEE NOTHING !!!


## BUILD

```
docker build --no-cache -t qhduan/agentjs:latest .
```

## RUN

```
docker run --name agentjs --restart=always -d -e ADDRESS="ws://" -e PORT="2080" -p 2080:2080 -e PASSWORD="" qhduan/agentjs:latest
```
