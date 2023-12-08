**Présentation de HashiCorp Vault**
  
HashiCorp Vault est une solution robuste et polyvalente de gestion des secrets conçue spécifiquement pour les environnements DevOps modernes. Il offre une plateforme centralisée pour stocker, gérer et distribuer de manière sécurisée les informations sensibles telles que les clés d'API, les mots de passe, les certificats, et autres données sensibles.

Vault se distingue par sa capacité à fournir une solution complète de bout en bout pour la gestion des secrets, tout en intégrant des fonctionnalités avancées telles que le chiffrement automatique, la rotation des secrets, et une gestion fine des politiques d'accès.

## Installation et Configuration de HashiCorp Vault

L'installation de HashiCorp Vault peut être réalisée sur différentes plateformes, en utilisant des conteneurs, des machines virtuelles ou des installations natives. La configuration initiale est cruciale et nécessite une attention particulière pour garantir la sécurité et la robustesse du déploiement. Les choix liés à la persistance des données, la haute disponibilité, et l'intégration avec d'autres services sont des aspects clés à considérer lors de cette étape.

Pour cette session, nous déploierons Vault dans un environnement conteneurisé avec docker compose.

Créez un fichier docker-compose.yaml avec ce contenu(voir repo),

Cette configuration nous permet d'exécuter vault en mode développeur en spécifiant le root token qui ici est comme le mot de passe de l'utilisateur root


Puis exécutez le avec la commande:
```bash
docker compose up
```

Notez le clé de déverrouillage qui sera généré dans les logs du container sous ce format:

Unseal Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 

Une fois le vault lancé, initialisé le avec le commande:

```bash
docker exec -it vault vault operator init
```
Une fois le vault initialisé, nous devons le déverrouiller avec la commande

```bash
docker exec -it vault vault operator unseal unseal_key
```

Remplacez unseal_key par la clé que vous avez noté.

Nous pouvons maintenant stocker nos secrets dans le vault.


## Stockage Sécurisé des Secrets

Pour stocker nos secrets dans le vault, nous pouvons utiliser le cli ou l'interface web. accessible via l'adresse [http://localhost:8201](http://localhost:8201)

Pour vous connecter, entrer le root token que nous avons spécifié dans notre docker compose.

Une fois connecté, rendez-vous à l'adresse [http://localhost:8201/ui/vault/secrets](http://localhost:8201/ui/vault/secrets) puis cliquez sur **Enable new Secrets Engine** qui représente un dossier dans lequel vous allez stocker les secrets de votre application.

Vault nous offre une multitude de possibilité pour ce TP, nous choisirons **KV**

Alors cliquez sur kv puis dans path, entrez le nom de ce dossier.

Nous allons entrer secret_store.

Cliquez sur **enable** pour valider.

Nous pouvons maintenant créer un secret.

Cliquez sur create secret. Dans l'interface qui s'affiche, vous avez:

**Path: ** qui représente en quelque sorte le nom du secret ici, nous mettrons le nom de l'application qui consommera ces secrets (my_app)

Puis vous avez les champs clé-valeur par exemple, api_password:xxxxxxxxxxxxxxxxxxxxxxxxxxxx.

Notre secret créez, nous verrons comment l'injecter dans notre appplication.


## Gestion des Accès et des Politiques

La gestion fine des accès et des politiques constitue le cœur de HashiCorp Vault. Les politiques définissent les droits d'accès aux secrets en fonction des rôles des utilisateurs et des applications. Comprendre et maîtriser ces mécanismes est essentiel pour garantir une sécurité granulaire et une conformité aux normes réglementaires.

Nous allons configurer vault afin de permettre à notre application d'avoir accès aux secrets.

D'abord, nous allons activé une méthode d'authentification, celle que notre application utilisera pour accéder au vault.

Dans ce TP, nous utiliserons **Username & password**. 

Pour le faire, rendez-vous à l'adresse [http://localhost:8201/ui/vault/settings/auth/enable](http://localhost:8201/ui/vault/settings/auth/enable) puis sélectionnez  **Username & password** puis sur next.

Dans path entrez le nom de la méthode nous laisserons userpass.

Puis créer un utilisateur en cliquant sur **Create User** remplissez les champs. username: my_app, password: sgsgsfshshj777779@@)(8

Cliquez sur tokens dans **Generated Token's Policies**, entrez **my_app_policy** (que nous allons créer par la suite)

Puis cliquez sur **Save**

Maintenant, nous allons créer les poliques d'accès. Dans la page d'acceuil du vault, cliquez sur policies puis sur **Create ACL Policy**

Entrez **my_app_policy** dans le champ name puis dans le champ policy, entrez ce code:


```hcl
path "secret_store/my_app" {
  capabilities = ["read"]
}
```
Ce code donne le droit de lecture au secret my_app qui se trouve dans l'engine **secret_store** à notre application. Ainsi, notre application aura accès en lecture à ce secret.

Cliquez sur **Create Policy** pour valider.



## Injection des secrets dans une application

Une fois le vault configurer, nous alllons créer une application et la configurer afin qu'elle puisse obtenir les secrets.

