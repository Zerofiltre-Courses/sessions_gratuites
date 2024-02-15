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