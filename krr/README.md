## Introduction à Kubernetes Resource Recommender (KRR)

Kubernetes Resource Recommender, abrégé en KRR, est un outil avancé conçu pour optimiser l'allocation des ressources au sein d'un cluster Kubernetes. Il vise à améliorer l'efficacité opérationnelle en recommandant des ajustements pertinents dans la configuration des ressources, telles que les requêtes (requests) et les limites (limits) pour les conteneurs s'exécutant dans le cluster.

Les principaux objectifs de KRR incluent l'optimisation des performances du cluster, la réduction du gaspillage de ressources, et la gestion efficace de la capacité. En analysant les modèles d'utilisation des ressources, KRR suggère des recommandations pour un dimensionnement optimal, permettant ainsi d'optimiser les coûts et d'assurer une meilleure réactivité du cluster aux charges de travail.

## Compréhension des Ressources Kubernetes

### Requests et Limits

Dans l'écosystème Kubernetes, les concepts clés liés à l'allocation des ressources sont les requêtes (requests) et les limites (limits). Les requêtes définissent la quantité minimale de ressources que le système doit allouer à un conteneur, tandis que les limites définissent la quantité maximale autorisée. Ces paramètres influent directement sur la manière dont les conteneurs utilisent les ressources matérielles du cluster.

### Importance de la Configuration Correcte

Un dimensionnement correct des requêtes et des limites est crucial pour garantir des performances optimales et une utilisation efficace des ressources. Une sous-allocation peut entraîner des performances médiocres, tandis qu'une surallocation peut entraîner un gaspillage inutile de ressources.

## Impact d’un bon dimensionnement sur les Performances

### Performances et Évolutivité

Un dimensionnement approprié des ressources a un impact direct sur les performances et l'évolutivité d'un cluster Kubernetes. En ajustant les paramètres de requêtes et de limites en fonction des besoins spécifiques des charges de travail, il est possible d'optimiser la réactivité du cluster et de garantir une utilisation efficiente des ressources.

### Réduction des Temps d'arrêt

KRR contribue à minimiser les temps d'arrêt en assurant une meilleure gestion des pics de charge. Cela permet au cluster de s'adapter de manière dynamique aux fluctuations de la demande, améliorant ainsi la disponibilité des applications.

## Installation et Configuration de KRR

Vous pouvez utiliser homebrew (que vous pouvez installer ici https://brew.sh/): 

Pour installer KRR, exécutez les commandes suivantes:
```bash
brew tap robusta-dev/homebrew-krr
brew install krr
krr --help
```

Si le message d'aide s'affiche normalement, krr est installé sur votre système.

Si vous n'avez pas envie d'installer un utilitaire supplémentaire sur votre PC comme nous, vous pouvez utiliser krr depuis le code source en suivant ces étapes:

NB: rassurez-vous d'avoir python 3.9 au moins installé 

```bash
git clone https://github.com/robusta-dev/krr
cd ./krr
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python krr.py --help
```

Dans ce cas, executez krr en utlisant python krr.py.



## Votre premier rapport: Analyse des Recommandations de Dimensionnement

### Rapport basique

KRR utilise des métriques et des données d'utilisation des ressources pour générer des recommandations de dimensionnement. Pour obtenir votre premier rapport basique, exécutez le commande:

NB: Pour plus de précision, prometheus doit avoir été installé dans votre cluster depuis plusieurs jours.

```bash
python .\krr.py simple
```

Si krr ne trouve pas prometheus de lui-même, suivez ces étapes:

- Exposez prometheus en utilisant le port-forwarding avec la commande kubectl sur le port 5555
- Executez plutot cette commande:

```bash
python .\krr.py simple -v -p http://localhost:5555
```

En faisant cela, vous indiquez à krr comment trouvez prometheus.

Si tout se passe bien, vous devriez obtenir un grand tableau

(tableau)

### Interprétation des Recommandations

![Rapport simple KRR](https://github.com/robusta-dev/krr/raw/main/images/screenshot.jpeg)

(voir tp)

