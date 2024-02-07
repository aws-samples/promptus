#!/bin/zsh
cd ./cdk || exit
export CATALYST_SOURCE_DIR_LAMBDAS=/Users/jwthewes/Development/internal/promptus
export CATALYST_SOURCE_DIR_FRONTEND=/Users/jwthewes/Development/internal/promptus
npm run build || exit
cdk destroy --all || exit