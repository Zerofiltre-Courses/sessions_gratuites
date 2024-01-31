# Optimisation des Images Docker


## A. Introduction aux Images Docker et Principes de Base
  
### 1. Pourquoi Docker

L'adoption de Docker s'avère cruciale. Docker révolutionne fondamentalement la manière dont nous concevons, développons et déployons des applications. Son principal atout réside dans la résolution du dilemme ***Cela fonctionne sur ma machine***. Docker offre une solution standardisée, assurant la portabilité des applications entre les environnements, qu'il s'agisse du poste de développement, du serveur de test ou de la production.

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
 
**Code non optimisé**

```dockerfile
FROM ubuntu:latest
FROM node:latest
FROM python:latest
```

**Code optimisé**

```dockerfile
FROM alpine:latest
FROM node:20-alpine
FROM python:3.8-alpine
```
  
### 2. Réduction du Nombre de Couches

Chaque couche dans une image Docker implique une surcharge. En consolidant les couches, nous optimisons les performances et simplifions la maintenance. Une image épurée est plus facile à comprendre, à mettre à jour et à sécuriser.

Pour réduire le nombre de couche, il vous suffit de réduire le nombre de commandes que votre dockerfile doit exécuter pour construire l'image

-  Regrouper les commandes dans un seul RUN
- Nettoyer les caches et les fichiers temporaires dans la même instruction
- Utiliser la directive COPY/ADD avec des wildcards

**Code non optimisé**

```dockerfile
RUN apt-get update
RUN apt-get install -y package1
RUN apt-get clean

COPY file1.txt /app/
COPY file2.txt /app/
```

**Code optimisé**

```dockerfile
RUN apt-get update && \
	apt-get install -y package1 && \ 
	apt-get clean

COPY package*.json /app/
```
  

### 3. Multi-Étapes dans le Dockerfile (Multistage Build)

L'approche multi-étapes, ou multistage build, est une technique puissante pour produire des images minimales. En éliminant les dépendances de construction inutiles dans l'image finale, nous réduisons la complexité tout en maintenant une image légère et fonctionnelle.

Il est souvent utilisé pour produire un image ne contenant que la version compilée l'application ainsi que les dépendances de production cas des frameworks par exemple.

Pour ce TP, nous allons utiliser un projet nestjs.

Commençons par le cloner puis entrons dans le répertoire:

```bash
git clone https://github.com/nestjs/typescript-starter
cd typescript-starter
```

  **Code non optimisé**

à la racine du projet, nous allons créer notre fichier  Dockerfile
```bash
touch Dockerfile
```

Avec le contenu suivant:
```dockerfile
FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

Puis créons image de notre application avec la commande suivante:
```bash
docker build -t project-image .
```


  **Code optimisé**
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

Puis créons image de notre application avec la commande suivante:
```bash
docker build -t project-image .
```

Comparez la taille des deux images.


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

## C. Bonnes Pratiques et Conseils Supplémentaires

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
