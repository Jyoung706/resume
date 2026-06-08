FROM python:3.12-slim

# 필수 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    python3-dev \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

RUN pip install --upgrade pip
RUN pip install setuptools==80.9.0
RUN pip install wheel==0.45.1

COPY requirements.txt .
RUN pip3 install --upgrade pip && pip3 install -r requirements.txt
RUN pip3 install debugpy

# run.sh 파일만 복사
COPY run.sh .

# 실행 권한 부여
RUN chmod +x run.sh

# 기본 실행 명령
CMD ["./run.sh"]