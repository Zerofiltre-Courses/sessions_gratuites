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

FROM node:18-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

###################
# Dependencies for build
###################

FROM base AS deps
COPY package*.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

###################
# Dependencies for production
###################

FROM base AS prod-deps
COPY package*.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

###################
# BUILD
###################

FROM deps AS build
COPY . .
RUN pnpm run build

###################
# PRODUCTION
###################


FROM node:18-alpine As production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
WORKDIR /app/

ENTRYPOINT [ "node", "/app/dist/main.js"]
```

### 4. Prise en compte de la Sécurité avec Docker Scout  

La sécurité des conteneurs est impérative. Docker Scout, un outil de sécurité avancé, analyse les images Docker à la recherche de vulnérabilités. Intégrer cette vérification dans le pipeline de développement garantit que les images déployées sont robustes et exemptes de failles de sécurité connues.

Nous allons commencer par activer le scan de notre image sur le Docker HUB

**NB:** Vous devez créer un compte sur Docker HUB.
  
  ![docker scout activation](https://firebasestorage.googleapis.com/v0/b/wachatgpt-237.appspot.com/o/Capture%20d%27%C3%A9cran%202023-12-26%20081053.png?alt=media&token=31c2b444-1fe4-43f5-95b5-f5c4891870f1)

Puis allez sur le site [https://scout.docker.com/](https://scout.docker.com/)

![Docker Scout Dashboard](https://firebasestorage.googleapis.com/v0/b/wachatgpt-237.appspot.com/o/Capture%20d%27%C3%A9cran%202023-12-26%20082739.png?alt=media&token=be8f58c5-57e9-4261-9ee8-c07cd9868d2c)

Depuis ce dashboard, vous avez un aperçu de l'état de sécurité de votre repos.

Allons dans l'onglet vulnérabilités pour obtenir la liste des vulnérabilités présentes dans nos images:

![enter image description here](https://firebasestorage.googleapis.com/v0/b/wachatgpt-237.appspot.com/o/Capture%20d%27%C3%A9cran%202023-12-26%20083140.png?alt=media&token=ce9f2e8e-43fb-427c-b71e-e89bbb52f4c7)


En fonction de ce que vous obtenez, vous saurez comment corriger les failles.

Vous pouvez aussi utiliser les commandes du docker CLI:

```bash
docker scout cves hashicorp/vault
```

Par exemple pour scanner l'image d'Hashicorp Vault.

## C. Bonnes Pratiques et Conseils Supplémentaires

L'optimisation de la gestion des fichiers temporaires et du cache dans vos Dockerfiles est une pratique souvent négligée mais d'une importance capitale. Docker utilise le cache des couches pour accélérer les constructions en évitant la répétition d'étapes inchangées. Cependant, il est essentiel de comprendre comment ce cache fonctionne et d'en tirer parti judicieusement.

Lorsque vous copiez des fichiers dans votre image, faites-le de manière sélective. Copier d'abord les fichiers moins susceptibles de changer, comme les fichiers de configuration, pour maximiser le bénéfice du cache. De plus, nettoyez les fichiers temporaires non nécessaires après les étapes qui les utilisent. Cela garantit des images plus légères et des constructions plus rapides.

```dockerfile
FROM node:alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

RUN npm run cleanup

CMD ["npm", "start"]
```

### 2. `.dockerignore` et Exclusions

L'utilisation du fichier `.dockerignore` est souvent négligée, mais elle peut avoir un impact significatif sur les performances de construction et la taille de l'image. Ce fichier fonctionne de manière similaire à `.gitignore`, permettant d'exclure des fichiers et des répertoires non pertinents du contexte de construction.

Excluez les fichiers de build locaux, les fichiers de configuration spécifiques au développeur, et tout autre élément qui n'est pas essentiel à l'exécution de l'application dans un conteneur. Cela réduit le temps de construction, évite de surcharger l'image avec des artefacts inutiles et améliore la sécurité en excluant des éléments sensibles comme vos fichiers d'environnements.

### 3. Stratégies pour Éviter les Installations Inutiles

  
En tant qu'expert chevronné dans le domaine du DevOps, l'approche des bonnes pratiques et des conseils supplémentaires lors de la manipulation de Docker est cruciale. Ces éléments vont bien au-delà de la simple construction d'images et englobent des considérations essentielles pour assurer la stabilité, la sécurité et la maintenabilité de vos conteneurs. Plongeons dans ces recommandations approfondies.

### 1. Gestion des Fichiers Temporaires et du Cache

L'optimisation de la gestion des fichiers temporaires et du cache dans vos Dockerfiles est une pratique souvent négligée mais d'une importance capitale. Docker utilise le cache des couches pour accélérer les constructions en évitant la répétition d'étapes inchangées. Cependant, il est essentiel de comprendre comment ce cache fonctionne et d'en tirer parti judicieusement.

Lorsque vous copiez des fichiers dans votre image, faites-le de manière sélective. Copier d'abord les fichiers moins susceptibles de changer, comme les fichiers de configuration, pour maximiser le bénéfice du cache. De plus, nettoyez les fichiers temporaires non nécessaires après les étapes qui les utilisent. Cela garantit des images plus légères et des constructions plus rapides.

DockerfileCopy code

`# Exemple de gestion des fichiers temporaires et du cache
FROM node:alpine

WORKDIR /app

# Copie des fichiers de configuration en premier pour profiter du cache
COPY package.json .
COPY package-lock.json .

# Installation des dépendances
RUN npm install

# Copie des fichiers source
COPY . .

# Nettoyage des fichiers temporaires
RUN npm run cleanup

# Commande d'exécution
CMD ["npm", "start"]` 

### 2. `.dockerignore` et Exclusions

L'utilisation du fichier `.dockerignore` est souvent négligée, mais elle peut avoir un impact significatif sur les performances de construction et la taille de l'image. Ce fichier fonctionne de manière similaire à `.gitignore`, permettant d'exclure des fichiers et des répertoires non pertinents du contexte de construction.

Excluez les fichiers de build locaux, les fichiers de configuration spécifiques au développeur, et tout autre élément qui n'est pas essentiel à l'exécution de l'application dans un conteneur. Cela réduit le temps de construction, évite de surcharger l'image avec des artefacts inutiles et améliore la sécurité en excluant des éléments sensibles.

### 3. Stratégies pour Éviter les Installations Inutiles

La gestion des installations de logiciels et de dépendances est un aspect crucial pour maintenir des images légères. Évitez d'installer des paquets superflus qui ne sont pas nécessaires à l'exécution de l'application. Utilisez des outils spécifiques à la distribution (comme `apk` pour Alpine Linux) pour installer uniquement ce qui est requis.

Procédez également à une suppression appropriée des outils de build et des dépendances temporaires après leur utilisation. Cela garantit que votre image contient uniquement ce qui est nécessaire à l'exécution.

```dockerfile
FROM node:alpine

WORKDIR /app

# Installation de dépendances avec apk
RUN apk add curl

# Copie des fichiers de configuration
COPY package.json .
COPY package-lock.json .

# Installation des dépendances de production uniquement
RUN npm install --only=production

COPY . .

# Nettoyage des dépendances de build et temporaires
RUN npm prune --production

CMD ["npm", "start"]
```