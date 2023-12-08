require('dotenv').config()

const vault = require("node-vault")({
    apiVersion: "v1",
    endpoint: "http://127.0.0.1:8201",
});

const run = async () => {
    const result = await vault.userpassLogin({
        username: process.env.VAULT_USERNAME,
        password: process.env.VAULT_PASSWORD,
    });

    vault.token = result.auth.client_token

    const { data } = await vault.read("secret/data/secret_store/my_app");

    console.log(data);
};  


run();