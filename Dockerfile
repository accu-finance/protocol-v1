FROM node:16.5.0-alpine3.14

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY hardhat.config.ts /app/hardhat.config.ts
COPY tsconfig.json /app/tsconfig.json
COPY .setup.js /app/.setup.js

COPY contracts /app/contracts
COPY constants /app/constants
COPY markets /app/markets
COPY deploy /app/deploy
COPY types /app/types
COPY utils /app/utils

RUN npm i

EXPOSE 8545

ENTRYPOINT [ "npm" ]

CMD [ "run", "hardhat" ]
