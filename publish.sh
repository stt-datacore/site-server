#!/bin/bash
GIT_PATH=/home/stt/site-server

pushd $GIT_PATH
# This would be more thorough but would also require re-installing all dependencies in node_modules
#git clean -x
rm -rf ./build/

git pull 2>&1
if [ $? -ne 0 ]
then
    echo "Failed during git pull"
    exit 1
fi

npm install 2>&1
if [ $? -ne 0 ]
then
    echo "Failed during npm install"
    exit 2
fi

npm run tsc
if [ $? -ne 0 ]
then
    echo "Failed during npm build"
    exit 3
fi

popd

sudo pm2 restart server

# sudo systemctl restart nginx
