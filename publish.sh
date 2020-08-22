#!/bin/bash
GIT_PATH=/home/stt/prod/site-server
DATA_PATH=/home/stt/prod/data

pushd $GIT_PATH

git pull 2>&1
if [ $? -ne 0 ]
then
    echo "Failed during git pull"
    exit 1
fi

# TODO: versioning?
docker build --tag stt-datacore/site-server:latest .
if [ $? -ne 0 ]
then
    echo "Failed during Docker build"
    exit 3
fi

popd

# TODO: remove old image and restart; is there a best practices for this?
docker stop DCSiteServer
docker rm DCSiteServer

docker run -d --name=DCSiteServer \
    --restart unless-stopped \
    --publish 4420:4420 \
    --mount type=bind,source="$DATA_PATH",target=/data \
    --env PROFILE_DATA_PATH=/data/profiles \
    --env DB_CONNECTION_STRING=sqlite:/data/datacore.db \
    --env-file "$DATA_PATH/env.list" \
    stt-datacore/site-server:latest
