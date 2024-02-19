import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 10000,
  duration: "30s"
};

function generateRandomNumberString(length) {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}


export default function () {
  
  http.post('http://nginx-service.loadtesting.svc.cluster.local:80/articles', JSON.stringify({
    title: `TITLE:${
      generateRandomNumberString(10)
    }`,
    description: 'Description du test article',
    content: 'Contenu du test article'
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  http.get('http://nginx-service.loadtesting.svc.cluster.local:80/articles');
  sleep(1);
}