# Optimisation des Images Docker

## A. Introduction aux Images Docker et Principes de Base

### 1. Pourquoi Docker

L'adoption de Docker s'avère cruciale. Docker révolutionne fondamentalement la manière dont nous concevons, développons et déployons des applications. Son principal atout réside dans la résolution du dilemme ***"Cela fonctionne sur ma machine"***. Docker offre une solution standardisée, assurant la portabilité des applications entre les environnements, qu'il s'agisse du poste de développement, du serveur de test ou de la production.

La gestion des dépendances, la facilité de mise à l'échelle et l'isolation des applications deviennent des aspects essentiels dans un écosystème DevOps. Docker permet d'atteindre ces objectifs tout en offrant une cohérence remarquable, quel que soit le stade du cycle de vie de l'application.

### 2. Concepts de base

#### a. Conteneurisation

La conteneurisation, au cœur de Docker, offre une encapsulation légère des applications et de leurs dépendances. Elle assure une isolation efficace, permettant aux développeurs de créer des environnements reproductibles. Cela se traduit par une réduction des conflits entre les versions de bibliothèques et garantit que ce qui fonctionne localement fonctionnera de la même manière dans n'importe quel autre environnement Docker.

#### b. Images

Les images Docker représentent des modèles immuables. Chaque image est composée de couches, une abstraction puissante qui capture les modifications du système de fichiers. Cette approche modulaire facilite les mises à jour et les déploiements incrémentiels, tandis que la gestion efficace des changements garantit l'intégrité et la réplicabilité des images.

#### c. Dockerfile

Le Dockerfile, en tant que script de construction d'image, offre une flexibilité exceptionnelle. En définissant les étapes nécessaires à la création de l'image, il permet de spécifier l'environnement, les dépendances et les actions d'exécution. Cette approche déclarative s'aligne parfaitement avec les principes d'infrastructure en tant que code.

## B. Techniques Avancées d'Optimisation

### 1. Utilisation d'Images Légères

Les images légères comme Alpine Linux réduisent considérablement la taille finale de l'image en nous évitant des programmes inutiles pour notre application et en gardant le stricte minimum, minimisant ainsi la surface d'attaque potentielle pour les vulnérabilités.

Par exemple:

Conteneurisation d'une application NodeJS

```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

Si construisez cette image, vous vous rendez compte qu'elle pèse environ 300Mo. Mais si nous utilisons l'image alpine de NodeJS, sa taille diminue drastiquement.


### 2. Réduction du Nombre de Couches

Chaque couche dans une image Docker implique une surcharge. En consolidant les couches, nous optimisons les performances et simplifions la maintenance. Une image épurée est plus facile à comprendre, à mettre à jour et à sécuriser.

Pour réduire le nombre de couche, il vous suffit de réduire le nombre de commandes que votre dockerfile doit exécuter pour construire l'image

Exemple:

```dockerfile
FROM ubuntu:18.04

# Installation des dépendances
RUN apt-get update \
    && apt-get install -y \
        build-essential \
        git \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Configuration et compilation de l'application
RUN git clone https://github.com/example/app.git \
    && cd app \
    && ./configure \
    && make

# Nettoyage
RUN apt-get purge -y build-essential git libssl-dev \
    && apt-get autoremove -y \
    && rm -rf /app/.git /var/lib/apt/lists/*

# Commande de démarrage de l'application
CMD ["/app/start.sh"]
```

Comme vous pouvez le constater, nous utilisons l'opérateur **&&** pour réduire le nombre d'instruction.

### 3. Multi-Étapes dans le Dockerfile (Multistage Build)

L'approche multi-étapes, ou multistage build, est une technique puissante pour produire des images minimales. En éliminant les dépendances de construction inutiles dans l'image finale, nous réduisons la complexité tout en maintenant une image légère et fonctionnelle.

Il est souvent utilisé pour produire un image ne contenant que la version compilée l'application ainsi que les dépendances de production cas des frameworks par exemple

Exemple:

```dockerfile
###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM  node:18-slim  AS  base
ENV  PNPM_HOME="/pnpm"
ENV  PATH="$PNPM_HOME:$PATH"
RUN  corepack  enable
WORKDIR  /app

###################
# Dependencies for build
###################

FROM  base  AS  deps
COPY  package*.json  pnpm-lock.yaml  ./
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm  install  --frozen-lockfile

###################
# Dependencies for production
###################

FROM  base  AS  prod-deps
COPY  package*.json  pnpm-lock.yaml  ./
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm  install  --prod  --frozen-lockfile

###################
# BUILD
###################

FROM  deps  AS  build
COPY  .  .
RUN  pnpm  run  build

###################
# PRODUCTION
###################

FROM  node:18-alpine  As  production

COPY  --from=prod-deps  /app/node_modules /app/node_modules

COPY  --from=build  /app/dist  /app/dist

WORKDIR  /app/

ENTRYPOINT  [  "node", "/app/dist/main.js"]
```

