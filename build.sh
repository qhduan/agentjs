#/usr/bin/bash

cd agentClientSrc
zip -r ../agentClient.nw ./*
cd ..

cat nw-linux-64 agentClient.nw > build/linux64/agentClient
chmod +x build/linux64/agentClient

# on mac: cp app.nw nw/Contents/Resources/
# on win: copy /b nw.exe+app.nw > foo.exe
