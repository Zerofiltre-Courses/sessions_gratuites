# **Scalabilité horizontale des Applications Kubernetes: HPA ou KEDA**

![enter image description here](https://i.ibb.co/KFPPSYt/Horizontal-Pod-Autoscaler-HPA.png)


## **Problématique :**

Imaginez un orchestre jouant une symphonie complexe. Chaque musicien représente un élément de notre application, et notre défi est de faire en sorte que l'orchestre soit capable d'ajuster dynamiquement son nombre de musiciens pour s'adapter à l'intensité de la musique sans jamais sacrifier la qualité. Dans l'univers Kubernetes, nos applications sont comme cet orchestre, et la question cruciale devient : comment pouvons-nous assurer que notre orchestre (l'application) ajoute automatiquement plus de musiciens (pods) quand la mélodie devient intense et réduit leur nombre lorsqu'elle se calme, tout cela sans perdre en harmonie ni gaspiller des ressources?

![enter image description here](https://i.ibb.co/RN9hsB8/steve-carrell-magic.gif)

C'est là que les "magiciens" Kubernetes entrent en scène avec deux baguettes différentes : le Horizontal Pod Autoscaler (HPA) et le Kubernetes Event-driven Autoscaling (Keda). Ces magiciens ont chacun leur propre manière de faire en sorte que notre orchestre reste synchronisé avec la complexité des morceaux qu'il joue. Mais comment choisir entre ces deux approches? Comment peuvent-ils garantir que notre orchestre reste à la fois dynamique et économe en ressources dans le monde toujours changeant de Kubernetes?

Plongeons dans cet article pour démystifier ces deux magiciens et découvrir comment ils abordent la magie de la scalabilité horizontale automatique sur Kubernetes, avec pour objectif ultime de créer une symphonie sans faille dans notre orchestre d'applications conteneurisées.


## Cas d'utilisation 1: Architecture basique(Serveur Web)

Nous allons déployer un serveur web apache dans notre cluster

![apache-architecture](https://i.ibb.co/2MjRTQ5/apache.png)

**Implémentation: serveur web**

Créez un fichier *apache-server.yaml* avec le contenu suivant:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: wizy-server
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: php-apache
  namespace: wizy-server
spec:
  selector:
    matchLabels:
      run: php-apache
  template:
    metadata:
      labels:
        run: php-apache
    spec:
      containers:
      - name: php-apache
        image: registry.k8s.io/hpa-example
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 500m
          requests:
            cpu: 200m
---
apiVersion: v1
kind: Service
metadata:
  name: php-apache
  namespace: wizy-server
  labels:
    run: php-apache
spec:
  ports:
  - port: 80
  selector:
    run: php-apache
```

Puis appliquer cette configuration avec la commande:

```bash
kubectl apply -f apache-server.yaml
``` 

Puis vérifiez l'état du déploiement en vérifiant le statut des pods via cette commande

```bash
kubectl get pods -n wizy-server
``` 
Notre serveur prêt, nous allons le mettre à l'échelle en utilisant nos deux méthodes KEDA et HPA .


### **HPA: la solution native**

![enter image description here](https://i.ibb.co/nm9qRBK/hpa-arch.png)

Le Horizontal Pod Autoscaler (HPA) fonctionne en surveillant les métriques spécifiées, telles que l'utilisation du CPU, de la mémoire ou même des métriques personnalisées stockés dans une base de données comme Prometheus. Si la charge de travail augmente au-delà d'un seuil défini, le HPA augmentera le nombre de pods pour gérer la charge supplémentaire. De même, si la charge diminue, il peut réduire le nombre de pods pour économiser des ressources.

#### **Implémentation 1**

![apache-hpa](https://i.ibb.co/qxBhZPH/apache-hpa.png)

Dans le fichier *apache-server.yaml*, ajoutez le code suivant:

```yaml
---
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: php-apache-hpa
  namespace: wizy-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: php-apache
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 50
```

Explication:
  
Ce code définit un mécanisme d'auto-évolutivité horizontale (Horizontal Pod Autoscaler ou HPA) dans Kubernetes pour surveiller et ajuster automatiquement le nombre de pods d'un déploiement spécifique, `php-apache`, en fonction de l'utilisation de la CPU. Il établit des bornes pour le nombre de pods (1 minimum, 10 maximum) et vise à maintenir une utilisation de la CPU autour de 50%. Ainsi, l'HPA garantit une utilisation efficace des ressources tout en répondant dynamiquement à la demande applicative.

Maintenant nous pouvons appliquer notre hpa
```bash
kubectl apply -f apache-server.yaml
``` 

et simuler les requêtes sur notre serveur apache avec cette commande

```shell
kubectl run -i -n wizy-server --tty load-generator --rm --image=busybox:1.28 --restart=Never -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://php-apache; done"
```

Maintenant exécutez la commande suivante pour observer la magie opérer 

```bash
kubectl get hpa php-apache-hpa -n wizy-server --watch
```

Après environ une minute, vous devriez constater une augmentation de la charge CPU et du nombre de pods



## KEDA

![enter image description here](https://i.ibb.co/3Mhxwng/keda-arch.png)

KEDA, l'acronyme pour Kubernetes-based Event-Driven Autoscaling est une solution vraiment intéressante. KEDA offre une approche basée sur des événements pour ajuster automatiquement l'échelle des applications, offrant ainsi une réactivité dynamique aux changements dans la charge de travail.

**ScaledObject:** Un ScaledObject est une ressource CRD (Custom Resource Definition) définie par Keda. Il représente un déploiement Kubernetes que Keda peut mettre à l'échelle. Un ScaledObject spécifie :

-   Le nom du déploiement à mettre à l'échelle
-   La métrique à utiliser pour le déclenchement de la mise à l'échelle
-   La stratégie de mise à l'échelle (horizontale ou verticale)
-   Les limites de mise à l'échelle (min et max)

**Controller** Le composant principal de Keda. Il s'agit d'un contrôleur qui surveille les ScaledObjects et effectue les mises à l'échelle en fonction des metrics et des définitions de mise à l'échelle.

**4. Metrics Adapter:** Un adaptateur de métrique est un composant qui convertit une métrique externe en un format que Keda peut comprendre. Keda prend en charge plusieurs adaptateurs de métriques pour différents types de sources de métriques, telles que Prometheus, Azure Monitor, et AWS CloudWatch.

**5. Horizontal Pod Autoscaler (HPA):** Le HPA est un contrôleur Kubernetes intégré qui peut mettre à l'échelle automatiquement les pods en fonction de l'utilisation des ressources. Keda peut utiliser le HPA pour effectuer des mises à l'échelle horizontales.

**6. External Trigger Source:** Keda peut également être déclenché par des sources externes, telles que des événements, des webhooks ou des changements de configuration.

**7. Workload:** La charge de travail est l'application ou le service qui est mis à l'échelle par Keda défini dans le ScaledObject.

Nous allons configurer la scalabilité de notre serveur web avec keda.

Avant, commençons par installer KEDA

Il vous suffit d'executer les commandes suivantes:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

Pour installer keda sur MicroK8S c'est simple utilisé juste les commandes

```bash
microk8s enable dns 
microk8s enable keda
```
Elles vont activer les extensions keda et dns.

#### **Implémentation 2**

![enter image description here](https://i.ibb.co/2kyH6c3/apache-keda.png)

D'abord, supprimez le HPA que nous avons créé précédemment pour éviter les conflits

```bash
kubectl delete hpa php-apache-hpa -n wizy-server
```

Nous pouvons maintenant créez ScaledObject KEDA.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: php-apache-cpu-scaledobject
  namespace: wizy-server
spec:
  scaleTargetRef:
    name: php-apache
  triggers:
  - type: cpu
    metricType: AverageValue
    metadata:
      value: "50"
```

Dans ce `ScaledObject`, nous spécifions que nous voulons scaler le déploiement `php-apache` dans le namespace `wizy-server`. Nous configurons également un déclencheur basé sur l'utilisation de la CPU avec une limite de 50 milli-CPU (`50m`). Cela signifie que lorsque l'utilisation de la CPU dépasse cette limite, KEDA scalerait le déploiement en conséquence.

**Important:** Vous devez specifier les CPU limits et requests.

Il ne vous reste plus qu'à observer vos pods se multiplier.


### **Constat**

Comme nous pouvons le constater, pour une utilisation basique c'est à dire une mise à l'échelle qui se base sur des métriques de bases comme l'utilisation des ressources (CPU, mémoire), l'implémentation des deux méthodes est assez simples bien sur ici HPA gagne la comparaison car il n'a pas besoin d'installation supplémentaire.

N'oubliez pas de nettoyer votre cluster en supprimant le namespace de travail

```bash
kubectl delete ns wizy-server
```

## Cas d'utilisation 2: Event-driven architecture(Consumer-RabbitMQ-Producer)

![architecture-hpa](https://i.ibb.co/Fw2W3KP/rabbitmq-drawio.png)

Comme vous pouvez le constater, nous utilisons une architecture orienté évènement avec un MessageBroker qui est RabbitMQ. Ici le producer va envoyer une suite de message dans une pile RabbitMQ. Puis, nous avons des consumer qui viennent récupérer les messages à tour de rôle. Afin d'éviter un ralentissement de notre application, nous souhaitons augmenter le nombre de consumer en fonction du nombre de requête dans la file. Comme mentionné plus haut, sur k8s nous avons deux solutions le HPA et le KEDA.

Déjà, mettons notre application en place:

- Installons Rabbitmq dans notre cluster. Pour cela, créer un fichier *rabbitmq.yaml* avec le contenu suivant:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: eda-rabbitmq
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: eda-rabbitmq
spec:
  selector:
      app: rabbitmq
  ports:
    - name: amqp
      port: 5672
      targetPort: 5672
    - name: prometheus
      port: 15672
      targetPort: 15672
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: eda-rabbitmq
spec:
  serviceName: rabbitmq
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3.13.0-rc.4-management
          ports:
            - containerPort: 5672
            - containerPort: 15672
```

Ce fichier nous permet de déployer Rabbitmq avec un statefullset et de l'exposer via un service sur le port 5672 dans le namespace eda-rabbitmq.

Déployons rabbitmq avec la commande:

```bash
kubectl apply -f rabbitmq.yaml
```

Rassurez-vous que tout c'est bien passé en observant le statut des pods:

```bash
kubectl get pods -n eda-rabbitmq
```

Si tous les pods sont en running, alors rabbitmq est opérationnel dans votre cluster.

-  Notre application

Nous allons déployer un client dont le rôle est de consommer les élément de la file d'attente.

Créez un fichier *consumer.yaml* avec le contenu suivant:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-consumer
  namespace: eda-rabbitmq
  labels:
    app: rabbitmq-consumer
spec:
  selector:
    matchLabels:
      app: rabbitmq-consumer
  template:
    metadata:
      labels:
        app: rabbitmq-consumer
    spec:
      containers:
        - name: rabbitmq-consumer
          image: ghcr.io/kedacore/rabbitmq-client:v1.0
          imagePullPolicy: Always
          command:
            - receive
          args:
            - "amqp://rabbitmq.eda-rabbitmq.svc.cluster.local:5672"
       
```
Puis un producer dont le rôle sera de remplir la file. Créez un fichier *producer.yaml* avec le contenu suivant:


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-producer
  namespace: eda-rabbitmq
  labels:
    app: rabbitmq-producer
spec:
  selector:
    matchLabels:
      app: rabbitmq-producer
  template:
    metadata:
      labels:
        app: rabbitmq-producer
    spec:
      containers:
        - name: rabbitmq-producer
          image: ghcr.io/kedacore/rabbitmq-client:v1.0
          imagePullPolicy: Always
          command:
            [
              "send",
              "amqp://rabbitmq.eda-rabbitmq.svc.cluster.local:5672",
              "300",]
```

Déployons notre client et notre producer avec les commandes 

```bash
kubectl apply -f consumer.yaml
kubectl apply -f producer.yaml
```

Assurez vous que les pods sont en running

```bash
kubectl get pods -n eda-rabbitmq
```

Notre application déployée, configurons sa mise en échelle

### HPA

Pour atteindre cette objectif avec HPA, nous devons configurer  notre système comme ceci:

![hpa-custom](https://i.ibb.co/XVMGnj1/rabbit-hpa.png)

**Explication:** RabbitMQ va exposer des métriques qui seront stockées dans Prometheus. La HPA exploitera donc ces métriques pour mettre en échelle notre application via sa fonctionnalité Custom Metrics. On aura également un dashboard grafana pour observer l'évolution des messages dans la file.

D'expérience l'implémentation de cette architecture est complexe avec des composants peu stables.

## **KEDA**

L'implémentation avec keda est moins complexe qu'avec un HPA car KEDA dispose dune variété de Trigger qui vont nous permettre de mettre à l'échelle notre application avec un minimum de configuration entre autre rabbitMQ.

### **Implémentation 3**


Créer un fichier keda-config.yaml avec le contenu suivant:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-consumer-secret
  namespace: eda-rabbitmq
data:
  RabbitMqHost: YW1xcDovL3JhYmJpdG1xLmVkYS1yYWJiaXRtcS5zdmMuY2x1c3Rlci5sb2NhbDo1Njcy

---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer
  namespace: eda-rabbitmq
spec:
  scaleTargetRef:
    name: rabbitmq-consumer
  pollingInterval: 5
  cooldownPeriod: 30
  maxReplicaCount: 30
  triggers:
    - type: rabbitmq
      metadata:
        queueName: hello
        queueLength: "5"
      authenticationRef:
        name: rabbitmq-consumer-trigger
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-consumer-trigger
  namespace: eda-rabbitmq
spec:
  secretTargetRef:
    - parameter: host
      name: rabbitmq-consumer-secret
      key: RabbitMqHost
```

Ce fichier va créer:

* Un secret qui stocke l'hote de rabbitmq. Keda l'utilisera pour s'y connecter
* Un ScaledObject propre à Keda, son rôle est de definir le comportement de keda la stratégie de scaling. Nous y reviendrons.
* TriggerAuthentication: il défini la connexion entre keda et rabbitmq

Déployons nos configurations avec la commande 

```bash
kubectl apply -f keda-config.yaml
```

Il ne nous reste plus qu'à observer keda mettre notre déployement à l'echelle avec la commande:

```shell
kubectl get deployment rabbitmq-consumer -n eda-rabbitmq --watch
```

Vous remarquerez l'augmentation du nombre de pods.

## **HPA vs KEDA**

HPA reste un outil puissant mais KEDA vient ajouter une couche d'abstraction qui nous permet de configurer facilement la scalabilité automatique de notre application. Ce pendant pour des besoins très poussés HPA reste une option incontournable. 
