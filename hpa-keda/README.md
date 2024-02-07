# **Scalabilité horizontale des Applications Kubernetes: HPA ou KEDA**

![enter image description here](https://i.ibb.co/KFPPSYt/Horizontal-Pod-Autoscaler-HPA.png)


## **Problématique :**

Imaginez un orchestre jouant une symphonie complexe. Chaque musicien représente un élément de notre application, et notre défi est de faire en sorte que l'orchestre soit capable d'ajuster dynamiquement son nombre de musiciens pour s'adapter à l'intensité de la musique sans jamais sacrifier la qualité. Dans l'univers Kubernetes, nos applications sont comme cet orchestre, et la question cruciale devient : comment pouvons-nous assurer que notre orchestre (l'application) ajoute automatiquement plus de musiciens (pods) quand la mélodie devient intense et réduit leur nombre lorsqu'elle se calme, tout cela sans perdre en harmonie ni gaspiller des ressources?

![enter image description here](https://i.ibb.co/RN9hsB8/steve-carrell-magic.gif)

C'est là que les "magiciens" Kubernetes entrent en scène avec deux baguettes différentes : le Horizontal Pod Autoscaler (HPA) et le Kubernetes Event-driven Autoscaling (Keda). Ces magiciens ont chacun leur propre manière de faire en sorte que notre orchestre reste synchronisé avec la complexité des morceaux qu'il joue. Mais comment choisir entre ces deux approches? Comment peuvent-ils garantir que notre orchestre reste à la fois dynamique et économe en ressources dans le monde toujours changeant de Kubernetes?

Plongeons dans cet article pour démystifier ces deux magiciens et découvrir comment ils abordent la magie de la scalabilité horizontale automatique sur Kubernetes, avec pour objectif ultime de créer une symphonie sans faille dans notre orchestre d'applications conteneurisées.

## Mise en situation

Supposons que nous avons une application qui génère des PDF en ligne avec l'architecture suivante:

![enter image description here](https://i.ibb.co/z8Rbsqn/rabbitmq-beginners-updated.png)

Comme vous pouvez le constater, nous utilisons une architecture orienté évènement avec un MessageBroker qui est RabbitMQ. Lorsqu'on utilisateur souhaite générer un pdf, la requête est envoyé dans une file d'attente qui est géré par le message broker. Puis, nous avons des consumer qui viennent s'occuper du traitement de la requête à tour de rôle. Afin d'éviter un ralentissement de notre application, nous souhaitons augmenter le nombre de consumer en fonction du nombre de requête dans la file. Comme mentionné plus haut, sur k8s nous avons deux solutions le HPA et le KEDA.

Déjà, mettons notre application en place:

- Installons Rabbitmq dans notre cluster. Pour cela, créer un fichier *rabbitmq.yaml* avec le contenu suivant:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: autoscale-pdf-generator
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: autoscale-pdf-generator
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
  namespace: autoscale-pdf-generator
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

Ce fichier nous permet de déployer Rabbitmq avec un statefullset et de l'exposer via un service sur le port 5672 dans le namespace autoscale-pdf-generator.

Déployons rabbitmq avec la commande:

```bash
kubectl apply -f rabbitmq.yaml
```

Rassurez-vous que tout c'est bien passé en observant le statut des pods:

```bash
kubectl get pods -n autoscale-pdf-generator
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
  namespace: autoscale-pdf-generator
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
            - "amqp://rabbitmq.autoscale-pdf-generator.svc.cluster.local:5672"
       
```
Puis un producer dont le role sera de remplir la file. Créez un fichier *producer.yaml* avec le contenu suivant:


```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq-producer
  namespace: autoscale-pdf-generator
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
              "amqp://rabbitmq.autoscale-pdf-generator.svc.cluster.local:5672",
              "300",]
```

Déployons notre client et notre producer avec les commandes 

```bash
kubectl apply -f consumer.yaml
kubectl apply -f producer.yaml
```

Assurez vous que les pods sont en running

```bash
kubectl get pods
```

Notre application déployée, configurons sa mise en échelle


## **HPA: la solution native**

Le Horizontal Pod Autoscaler (HPA) fonctionne en surveillant les métriques spécifiées, telles que l'utilisation du CPU, de la mémoire ou même des métriques personnalisées stockés dans une base de données comme Prometheus. Si la charge de travail augmente au-delà d'un seuil défini, le HPA augmentera le nombre de pods pour gérer la charge supplémentaire. De même, si la charge diminue, il peut réduire le nombre de pods pour économiser des ressources.

### Implémentation

Pour atteindre cette objectif avec HPA, nous devons configurer  notre système comme ceci:

![hpa-custom](https://i.ibb.co/XVMGnj1/rabbit-hpa.png)

**Explication:**

RabbitMQ va exposer des métriques qui seront stockées dans Prometheus. La HPA exploitera donc ces métriques pour mettre en échelle notre application via sa fonctionnalité Custom Metrics. On aura également un dashboard grafana pour observer l'évolution des messages dans la file.

- Premièrement, installez Prometheus dans votre cluster si ceci n'est pas encore fait, suivez l'article suivant: 

Ajoutez et mettez à jour le repos local avec les commandes suivantes

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```
Puis créez un namespace monitoring et installez la stack prometheus.
```bash
kubectl create ns monitoring
helm install kube-prom-stack prometheus-community/kube-prometheus-stack -n monitoring
```

- Puis installez l'adaptateur qui a pour rôle de créer des objets CustomMetrics et ExternalMetrics. Ces objets auront pour rôle de permettre au cluster d'exploiter vos métriques prometheus pour le HPA.

```bash
helm install prom-adpater prometheus-community/prometheus-adapter
```

- Ensuite, ajoutons un scrape au niveau de Prometheus pour l'indiquer où chercher les métriques de Rabbitmq. Dans votre fichier values.yaml (ref: installation de Prometheus) ajoutez les lignes suivantes

```yaml
- job_name: rabbitmq-exporter
  scrape_interval: 2m
  scrape_timeout: 1m
  metrics_path: '/metrics'
  scheme: http
  static_configs:
    - targets: ["rabbitmq.autoscale-pdf-generator:15692"]
```

Nous pouvons maintenant créer notre HPA. Créez un fichier hpa.yaml

```yaml
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: hpa
  namespace: autoscale-pdf-generator
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rabbitmq-consumer
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: External
      external:
        metricName: rabbitmq_queue_messages_ready
        targetAverageValue: 100

et l'appliquer en executant la commande
```bash
kubectl apply hpa.yaml
```

**Explication:**

-   `scaleTargetRef` : Indique la référence vers le déploiement auquel la HPA est associée. Dans ce cas, il s'agit d'un déploiement portant le nom `php-apache`.
    
-   `minReplicas` : Définit le nombre minimal de répliques (pods) que la HPA peut maintenir, ici fixé à 1.
    
-   `maxReplicas` : Définit le nombre maximal de répliques (pods) que la HPA peut créer, ici fixé à 10.
    
Maintenant que notre configuration est comprise, exécutons notre code avec la commande:

```bash
kubectl apply -h hpa-config.yaml
```



## **KEDA: la solution miracle**

C'est là que KEDA, l'acronyme pour Kubernetes-based Event-Driven Autoscaling, entre en jeu comme une solution vraiment intéressante. KEDA offre une approche basée sur des événements pour ajuster automatiquement l'échelle des applications, offrant ainsi une réactivité dynamique aux changements dans la charge de travail.

1.  **Adaptabilité aux Événements :**  Dans notre cas, KEDA  peut tirer profit des événements, comme les messages dans une file d'attente RabbitMQ. Cette approche orientée événements permet à KEDA d'ajuster automatiquement le nombre de pods en fonction de l'activité des messages, assurant ainsi une évolutivité adaptée.
    
2.  **Optimisation des Ressources et réduction des couts** Les pods peuvent être déployés ou retirés de manière dynamique, s'ajustant aux besoins réels, réduisant ainsi le gaspillage des ressources et maximisant l'efficacité opérationnelle.
    
3.  **Facilité de Configuration :** L'une de ses grandes forces est qu'il s'intègre naturellement avec les déploiements existants, sans nécessiter de changements majeurs dans le code de l'application. Cela simplifie grandement la mise en œuvre de l'autoscaling, rendant la solution robuste et facile à adopter.
   
## **Implémentation de KEDA**

### Installation 

- keda avec helm

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

- Rabbitmq



- Configuration keda

Maintenant, nous allons entrer dans le vif du sujet en configuration keda

Créer un fichier keda-config.yaml avec le contenu suivant:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-consumer-secret
  namespace: default
data:
  RabbitMqHost: YW1xcDovL3JhYmJpdG1xLnJhYmJpdG1xLnN2Yy5jbHVzdGVyLmxvY2FsOjU2NzI=

---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer
  namespace: default
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
  namespace: default
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
microk8s kubectl apply -f keda-config.yaml
```

Il ne nous reste plus qu'à observer keda mettre notre déployement à l'echelle avec la commande:

```shell
kubectl get deployment rabbitmq-consumer --watch
```

Vous remarquerez l'augmentation du nombre de pods.

## **HPA vs KEDA

-   **Cas d'utilisation**:
    
    -   Utilisez KEDA lorsque vous avez besoin d'autoscaling basé sur des événements spécifiques, comme le traitement de messages dans des files d'attente ou des flux de données.
    -   Utilisez HPA pour l'autoscaling basé sur des métriques de ressources standard dans des applications plus générales (mémoire, cpu, disque, etc).
    - 
-   **Flexibilité**:
    
    -   KEDA offre une plus grande flexibilité en permettant d'ajouter des sources d'événements personnalisées provenant de diverses sources (cloudwatch, kafka, prometheus, etc)
    -   HPA est limité aux métriques de ressources définies par Kubernetes.
-   **Intégration**:
    -   KEDA peut être utilisé en conjonction avec HPA pour fournir un autoscaling basé sur des événements et des métriques de ressources.
-   **Complexité**:
    -   KEDA peut être plus complexe à configurer en raison de sa flexibilité accrue.
