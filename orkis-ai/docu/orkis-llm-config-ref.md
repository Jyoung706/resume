# Overview
- llm worker 동적 구성을 위한 config 파일 사용법 안내

# basic_worker.yaml
- 기본 컴파일 worker_id 를 yaml list 로 정의
- 파일 경로 : tts_worker/core/conf/worker_conf/basic_worker.yaml
- 참고 : 
  - worker_id 는 worker config 파일의 파일명 임으로, 파일명 기재.

# worker config 파일
- 각 worker 의 노드 및 간선 구성 정보
- 파일 경로 : tts_worker/core/conf/worker_conf/*.yaml (basic_worker.yaml 제외)

| Field Name                  | 필드명                     | Type             | Required | Defualt Value | 설명                                             |
| --------------------------- | ----------------------- | ---------------- | -------- | ------------- | ---------------------------------------------- |
| worker_id                   | 워커ID                    | String           | false     |               | (Not used) Worker(Langgraph) 의 ID, 파일명으로 지정함.        |
| root_import_path            | 상위 임포트 경로               | String           | false    | None          | 동적 import 할 Work 의 공통 상위 경로                    |
| works                       | 워크 정보 사전                | Dictionary       | true     |               | Work(Langgraph Node) 의 설정 정보 사전                |
| - ${work_name}              | 워크 이름                   | String           | true     |               | Work(Langgraph Node) 의 고유한 이름                  |
| >import_path                | 워크 임포트 상세 경로            | String           | true     |               | 동적 import 할 Work 의 상세 경로                       |
| >args                       | 워크 인자 사전                | Dictionary       | true     | {}            | Work 동작 시 필요한 인자                               |
| edges                       | 워크 간선 정보 리스트            | List[Dictionary] | true     |               | Work(Langgraph Node) 간선(연결, Langgraph Edge) 정보 |
| - type                      | 간선 type                 | String           | true     |               | 'normal', 'conditional', 'recursive'  중 하나     |
| - src                       | 시작 work_name            | String           | true     |               |                                                |
| - dst                       | 도착 work_name            | String           | false    | None          | 'normal' type 시 필수값. 단일 노드만 설정 가능.             |
| - dsts                      | 도착 work_name List       | Dictionary       | false    | None          | 'conditional' type 시 필수값. n개 노드 설정 가능.         |
| >${conditional_worker_name} | 분기 worker_name          | String           | true     |               | key 는 조건 분기 명, value 는 worker_name 이 들어가야 함.   |
| - dst_rcr                   | 도착 work_name Dictionary | Dictionary       | false    | None          | 'recursive' type 시 필수값. 재귀 노드와 다음 노드만 설정 가능.   |
| > recursive                 | 재귀 도착 work_name         | String           | true     |               | 재귀 노드 이름.                                      |
| > next                      | 다음 도착 work_name         | String           | true     |               | 다음 노드 이름.                                      |
| > max_retry                 | 최대 반복 횟수                | Integer          | true     | 3             | 최대 반복 횟수.                                      |
