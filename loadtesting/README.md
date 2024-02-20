# Tests de charge distribués avec K6

# Introduction

Dans l'univers numérique effervescent d'aujourd'hui, la capacité à maintenir des systèmes informatiques résilients face à une charge massive est devenue une pierre angulaire de la compétitivité et de la satisfaction client. Imaginez un monde où une soudaine vague d'intérêt pour votre application ou service en ligne entraîne un effondrement catastrophique de votre infrastructure, laissant les utilisateurs frustrés et votre réputation en lambeaux. Pour éviter ce cauchemar, il est essentiel de concevoir des systèmes capables de s'adapter et de prospérer face à des demandes de plus en plus nombreuses.

  
Dans cet article, nous plongerons dans l'art de tester la robustesse d'un système en d'autres termes, s'il est capable de gérer une charge massive avec grâce et efficacité. En combinant la puissance de Kubernetes, un orchestrateur de conteneurs de premier plan. Notre objectif est clair : vous apprendre à vous assurer que votre application peut briller même sous les feux de la rampe les plus intenses.

  

# Prérequis

Avant de commencer les tests de notre systèmes notre système, assurez-vous d'avoir les éléments suivants en place :

- Connaissance de base de Kubernetes : Une compréhension élémentaire des concepts de base de Kubernetes est essentielle pour suivre ce guide. Assurez-vous de comprendre les notions telles que les Pods, les Deployments, les Services, et les Persistent Volume Claims (PVC).

- Accès à un cluster Kubernetes : Vous aurez besoin d'un cluster Kubernetes opérationnel pour déployer nos composants. Cela peut être un cluster local (comme minikube) ou un cluster géré dans le cloud (comme Google Kubernetes Engine, Amazon EKS, ou Microsoft AKS).

 
- Installation de kubectl : Assurez-vous d'avoir kubectl, l'outil en ligne de commande Kubernetes, installé et configuré pour interagir avec votre cluster Kubernetes.

  
- Connaissance de Node.js : Une compréhension de base du langage JavaScript et de l'environnement d'exécution Node.js sera utile pour comprendre et modifier le code de notre application web.

  
- Accès à Docker Hub (ou à n'importe quel autre registre) : Si vous souhaitez suivre la procédure de construction et de publication de notre application Node.js sur Docker Hub, assurez-vous d'avoir un compte Docker Hub et les autorisations nécessaires pour pousser des images Docker.

  

# Architecture de l'application

![enter image description here](https://i.ibb.co/y6c9Jh6/loadtesting-app-archi-drawio.png)

Voici une description détaillée de chaque composant de notre architecture :

1.  **Serveur Nginx (Reverse Proxy) :**

- Nginx joue le rôle de reverse proxy, servant de point d'entrée pour les requêtes entrantes vers notre application web. Il agit également comme un équilibrage de charge, répartissant le trafic entre les différentes instances de notre application.

2.  **Application Web Node.js :**
    
   - Notre application web est développée en utilisant Node.js, un environnement d'exécution JavaScript côté serveur, réputé pour sa rapidité et sa légèreté.
   -   L'application expose plusieurs endpoints pour la création et la lecture d'articles. 

3.  **Base de Données PostgreSQL :**
    
- PostgreSQL est notre choix de base de données relationnelle, réputée pour sa robustesse, sa performance et ses fonctionnalités avancées.
 -   Nous stockons les articles dans la base de données.
    
4.  **Déploiement sur Kubernetes :**

- Tous les composants de notre application sont déployés sur Kubernetes, un système d'orchestration de conteneurs puissant et flexible.
 -   Kubernetes nous offre la capacité de scaler automatiquement nos Pods en fonction de la charge.

# Implémentation de notre architecture

Passons au déploiement des composants de notre stack dans notre cluster K8S.

Je vous recommande de cloner notre repo github où vous trouverez tous les fichiers nécessaires:

```bash
git clone https://github.com/Zerofiltre-Courses/sessions_gratuites
 ```
Ensuite rendez-vous dans le dossier de ce projet *loadtesting* avec la commande

```bash
cd loadtesting
```

## **Base de Données PostgreSQL :**

D'abord, nous allons créer un namespace pour notre application

```bash
kubectl create namespace loadtesting
```

Nous allons maintenant déployer notre base de données PostgreSQL en utilisant le PostgreSQL Operator de Zalando. 

Ce service nous permettra de déployer facilement notre cluster PostgreSQL et le mettre à l'échelle.

Executez les commandes suivantes:

```bash
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator

# install the postgres-operator
helm install postgres-operator postgres-operator-charts/postgres-operator -n loadtesting
```
 
 Vérifier de notre opérateur est en état de marche en vérifiant le statut des pods:
 
```bash
kubectl get pod -l app.kubernetes.io/name=postgres-operator -n loadtesting
```

Si tout se passe bien, nous pouvons lancer notre cluster postgresql

Rendez-vous dans le dossier *applications/postgresql* et exécutez la fichier *postgresql-cluster.yaml*

```bash
cd applications/nginx
kubectl apply -f postgresql-cluster.yaml
```

Le code contenu dans ce fichier nous permet de déployer un cluster PostgreSQL minimal à l'aide du postgres-operator de Zalando dans un cluster Kubernetes. Voici une explication détaillée de chaque partie du code :

-   `apiVersion: "acid.zalan.do/v1"` : Spécifie la version de l'API personnalisée utilisée pour créer cette ressource. Dans ce cas, c'est la version v1 de l'API fournie par le postgres-operator.
    
-   `kind: postgresql` : Indique le type de ressource Kubernetes que nous créons. Dans ce cas, il s'agit d'une ressource PostgreSQL personnalisée, qui sera interprétée par le postgres-operator pour déployer et gérer un cluster PostgreSQL.
    
-   `metadata:` : Contient des métadonnées sur la ressource, telles que le nom et l'espace de noms.
    
    -   `name: acid-minimal-cluster` : Le nom de la ressource PostgreSQL que nous créons, dans cet exemple, c'est "acid-minimal-cluster".
        
    -   `namespace: loadtesting` : L'espace de noms dans lequel cette ressource sera créée. Dans cet exemple, c'est "loadtesting".
        
-   `spec:` : Spécifie les détails de configuration pour le déploiement du cluster PostgreSQL.
    
    -   `teamId: "acid"` : Identifiant de l'équipe associé à ce cluster PostgreSQL. Cela peut être utilisé pour des raisons de suivi ou de gestion des ressources.
        
    -   `volume:` : Spécifie la taille du volume de stockage pour le cluster PostgreSQL.
        
        -   `size: 1Gi` : Taille du volume de stockage, dans cet exemple, c'est de 1 GiB.
    -   `numberOfInstances: 1` : Nombre d'instances de PostgreSQL à déployer dans le cluster. Dans cet exemple, une seule instance est spécifiée.
        
    -   `users:` : Spécifie les utilisateurs à créer dans la base de données PostgreSQL.
        
        -   `newgenius:` : Nom de l'utilisateur à créer. Dans cet exemple, c'est "newgenius".
            
            -   `superuser` : Privilège de superutilisateur accordé à l'utilisateur.
                
            -   `createdb` : Autorisation de créer de nouvelles bases de données accordée à l'utilisateur.
                
    -   `databases:` : Spécifie les bases de données à créer dans le cluster PostgreSQL.
        
        -   `articles_db: newgenius` : Nom de la base de données et son propriétaire. Dans cet exemple, une base de données nommée "articles_db" est créée avec "newgenius" comme propriétaire.
    -   `postgresql:` : Spécifie la version de PostgreSQL à utiliser pour le cluster.
        
        -   `version: "15"` : Version de PostgreSQL à déployer. Dans cet exemple, c'est la version 15.


Vérifions que tout se passe bien en vérifiant le statut de notre cluster

```bash
kubectl get postgresql -n loadtesting
```

S'il est en *running*, notre cluster PostgreSQL est opérationnel.

## **Application Web Node.js :**

Le code source de notre backend est disponible dans le dossier *applications/backend*. Nous avons déjà déployer l'image pour vous il vous reste juste à déployer l'application dans votre cluster.

```bash
cd applications/backend
kubectl apply -f nodejs-service.yaml
```

Vérifiez le statut des pods ainsi que les logs pour vous assurer que tout ce passe bien.


## **Serveur Nginx (Reverse Proxy) :**

Pour déployer nginx, c'est assez simple. Rendez-vous dans le dossier *applications/nginx* et exécutez la fichier *nginx-service.yaml**

```bash
cd applications/nginx
kubectl apply -f nginx-service.yaml
```

Dans ce fichier, nous avons défini un déploiement pour Nginx avec une réplication d'une seule instance. Nous montons également un ConfigMap contenant notre configuration Nginx personnalisée, où nous avons défini un serveur écoutant sur le port 80 et redirigeant toutes les requêtes vers le service de notre application Node.js. Assurez-vous de remplacer `nodejs-service` par le nom de votre service Node.js dans la directive `proxy_pass`.

Par la suite vérifions que notre serveur nginx est bien déployé en vérifiant le statut des pods.

 ```bash
kubectl get pods -n loadtesting
```


# Test de charge avec k6

![enter image description here](https://i.ibb.co/5cNfMH4/k6-architectre.jpg)

Notre architecture installé commençons les tests de charge avec k6s

K6 est un outil moderne et flexible pour les tests de charge et de performance, offrant une approche simple mais puissante pour simuler le trafic utilisateur sur les applications web et les API. Grâce à sa syntaxe JavaScript intuitive et à sa structure de test déclarative, K6 permet aux équipes de développement et d'exploitation de créer facilement des scénarios de test personnalisés pour évaluer les performances de leurs systèmes.



Parmi les principales fonctionnalités de K6, on trouve :

- **Facilité d'utilisation** : Avec sa syntaxe JavaScript simple et sa structure de test intuitive, K6 permet aux utilisateurs de créer rapidement des tests de charge sans avoir besoin de compétences spécialisées en ingénierie de performance.
- **Scénarios flexibles** : K6 prend en charge la création de scénarios de test flexibles, permettant aux utilisateurs de simuler différents comportements d'utilisateur, tels que les sessions d'utilisateur, les interactions avec les formulaires et les requêtes d'API.
- **Gestion avancée des charges** : Avec K6, les utilisateurs peuvent contrôler finement la charge générée lors des tests, en ajustant le nombre de virtual users, les délais entre les requêtes et d'autres paramètres de charge pour simuler des conditions réalistes.
- **Analyse des résultats** : K6 offre des fonctionnalités robustes d'analyse des résultats, y compris des graphiques en temps réel, des métriques de performance détaillées et des rapports personnalisables, permettant aux utilisateurs de comprendre facilement les performances de leur application et d'identifier les goulots d'étranglement.
- **Intégration avec CI/CD** : K6 peut être facilement intégré dans les pipelines CI/CD, permettant aux équipes de tester automatiquement les performances de leurs applications à chaque étape du cycle de développement.

## Installation de k6 sur notre cluster

Pour installer k6 sur notre cluster, nous allons utiliser un chart Helm. Pour ce faire, exécutez les commandes suivantes :

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install k6-operator grafana/k6-operator --set namespace.create=false -n loadtesting
```

Vérifiez que le k6-operator est bien installé en vérifiant le statut des pods.

```bash
kubectl get pods -n loadtesting
```

## Exécution des tests de charge

Comme le pluspart des outils de tests, les tests de charges k6s sont écrits dans des fichiers javascript. Pour notre cas, nous avons déjà écrit un test de charge pour notre application dans le fichier *k6-loadtest.js*.

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  http.get('http://nginx-service.loadtesting.svc.cluster.local:80/articles');
  sleep(1);
}
```

Ce test de charge simule 100 utilisateurs accédant à notre application et récupérant la liste des articles toutes les secondes pendant 30 secondes.

Pour exécuter ce test de charge, nous allons d'abord créer un configsmaps k8s pour stocker notre fichier de test.

```bash
kubectl create configmap k6-loadtest --from-file=k6-loadtest.js -n loadtesting
```

Ensuite, nous allons créer un Objet k8s de type *k6* pour exécuter notre test de charge.

```yaml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: k6-loadtest
  namespace: loadtesting
spec:
  parallelism: 1
  script:
    configMap:
      name: k6-loadtest
      file: k6-loadtest.js
```

Enregistrez ce fichier sous le nom *k6-loadtest.yaml* et exécutez la commande suivante pour lancer le test de charge.

```bash
kubectl apply -f k6-loadtest.yaml
```

Ce fichier spécifie un objet K6 personnalisé qui exécute notre test de charge. Il définit le nombre de répétitions parallèles du test, le script de test à exécuter (stocké dans un ConfigMap) et d'autres paramètres de configuration.

Vérifiez que le test de charge est en cours d'exécution en vérifiant le statut des pods.

```bash
kubectl get pods -n loadtesting
```

Afficher les logs du pods avec la nomenclature: "k6-loadtest-1-*" pour obtenir le rapport de test.

Il devrait ressembler à quelque chose comme ceci:

![enter image description here](https://i.ibb.co/4tch551/image.png)

Amusez-vous à faire varier le nombre de replicas de vos composants pour observer les variations des métriques notamment 

- **http_req_duration**:  pour la durée des requêtes 


Rendez-vous dans le fichier *test-rapport.txt*  dans le dossier *loadtesting* du référentiel github. Il contient notre différents rapports de tests en fonction des paramètres comme le nombre d'utilisateur et le nombre de composants des réplicas.