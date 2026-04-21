// Bonus — Test de charge k6
// Lancer avec : k6 run -e PROJECT_ID=VOTRE-PROJECT-ID bonus/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '1m',  target: 50  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
  },
}

const BASE = 'https://fn-taskflow-guill2025.azurewebsites.net/api'

export default function () {
  const res = http.get(`${BASE}/project-stats?project_id=${__ENV.PROJECT_ID}`)
  check(res, {
    'status 200':         (r) => r.status === 200,
    'reponse < 500ms':    (r) => r.timings.duration < 500,
    'completion_rate OK': (r) => JSON.parse(r.body).completion_rate >= 0,
  })
  sleep(0.5)
}
