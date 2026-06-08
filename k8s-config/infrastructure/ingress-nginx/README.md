# ingress-nginx (ManagedKS)

## 설계
- DaemonSet + `hostNetwork: true`
- ingress 전용 노드(`app=ingress`)에서만 80/443 listen
- KT Cloud LB(L4 TCP)에서 해당 노드들로 패스스루
- ingressClassName: `nginx` (기존 `nginx-k8s` 대체)

## 설치

```bash
export KUBECONFIG=~/.kube/ManagedKS-config

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --version 4.15.1 \
  -f values.yaml
```

## 확인

```bash
kubectl -n ingress-nginx get ds,pod,svc -o wide
kubectl get ingressclass
```

## 업그레이드

```bash
helm repo update
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --version <new-version> -f values.yaml
```
