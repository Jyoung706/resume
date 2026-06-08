# cert-manager (ManagedKS)

## 설치

```bash
export KUBECONFIG=~/.kube/ManagedKS-config

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --version v1.20.2 \
  --set crds.enabled=true
```

CRD 설치 완료 대기 후 ClusterIssuer 적용:

```bash
kubectl apply -f clusterissuer.yaml
kubectl get clusterissuer
```

## 사용

Ingress 리소스에 다음을 추가:

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod   # 또는 letsencrypt-staging
spec:
  tls:
  - hosts:
    - <도메인>
    secretName: <도메인>-tls
```

## 발급 확인

```bash
kubectl describe certificate <name> -n <ns>
kubectl describe order,challenge -n <ns>
```

## 주의
- 신규 도메인 발급 테스트 시 `letsencrypt-staging` 먼저 → 정상이면 `letsencrypt-prod`로 전환
  (Let's Encrypt rate limit: prod는 1주 5회/도메인)
- HTTP-01 챌린지는 LB가 80/443 모두 패스스루해야 동작
