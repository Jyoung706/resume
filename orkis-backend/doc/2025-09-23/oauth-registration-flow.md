# OAuth 소셜 로그인 회원가입 및 자동 로그인 플로우

## 전체 플로우

### 1. OAuth 인증 시작
- **엔드포인트**: `POST /auth/oauthToken`
- **요청**: `{ type: "naver" | "kakao" | "google" }`
- **응답**: `{ url: "OAuth 인증 URL" }`
- **처리**: state 생성 및 저장, OAuth URL 리다이렉트

### 2. OAuth 콜백 처리
- **엔드포인트**: `POST /auth/loginCheck`
- **요청**: `{ code: "인증코드", state: "상태값" }`

#### 2-1. 기존 사용자인 경우
- **응답**:
```json
{
  "token": "로그인 토큰",
  "loginInfo": {
    "ID": "사용자ID",
    "EMAIL": "이메일",
    "NAME": "이름",
    "AUTH_CODE": "1|2|3",
    "LOGIN_TYPE": "naver|kakao|google"
  }
}
```
- **처리**: 즉시 로그인 완료

#### 2-2. 신규 사용자인 경우
- **응답**:
```json
{
  "isNewUser": true,
  "requiresRegistration": true,
  "userInfo": {
    "email": "사용자이메일",
    "name": "사용자이름",
    "provider": "naver|kakao|google",
    "socialId": "소셜ID"
  },
  "state": "상태값 (회원가입 시 사용)"
}
```
- **처리**: 프론트엔드에서 회원가입 화면 표시

### 3. 회원가입 처리 및 자동 로그인
- **엔드포인트**: `POST /auth/register`
- **요청**:
```json
{
  "email": "이메일",
  "name": "이름",
  "phone": "전화번호 (선택)",
  "userType": "personal|business|admin",
  "socialId": "소셜ID",
  "provider": "naver|kakao|google",
  "state": "상태값",
  "additionalInfo": {
    "username": "사용자명",
    "company": "회사명 (기업 사용자)",
    "department": "부서명 (선택)"
  }
}
```
- **응답**:
```json
{
  "success": true,
  "token": "로그인 토큰",
  "loginInfo": {
    "ID": "사용자ID",
    "EMAIL": "이메일",
    "NAME": "이름",
    "AUTH_CODE": "1|2|3",
    "LOGIN_TYPE": "naver|kakao|google",
    "USER_TYPE": "personal|business|admin"
  },
  "message": "회원가입이 완료되었습니다. 자동으로 로그인되었습니다.",
  "isNewUser": false,
  "requiresRegistration": false
}
```

## 권한 매핑 규칙

### 사용자 타입별 권한 코드
- **personal (개인)** → **1 (일반 모드)**
- **business (기업)** → **2 (프로 모드)**
- **admin (관리자)** → **3 (관리자 모드)**

### auth_license_user 테이블 자동 등록
- 회원가입 시 자동으로 1년 유효기간의 라이센스 생성
- 라이센스 코드 형식: `LIC_{사용자ID}_{권한코드}_{타임스탬프}`
- 중복 방지: 이미 유효한 권한이 있으면 추가 등록하지 않음

## 구현 파일

### Backend
- `/auth/LoginController.ts`
  - `oauthToken()`: OAuth 인증 시작
  - `oauthCallback()`: OAuth 콜백 처리
  - `registerSocialUser()`: 회원가입 및 자동 로그인

- `/auth/LoginService.ts`
  - `registerUser()`: 사용자 등록 및 권한 부여
  - `assignUserAuth()`: 권한 정보 할당

- `/auth/LoginDao.ts`
  - `saveUser()`: user_info 테이블 저장
  - `saveUserLicense()`: auth_license_user 테이블 저장

- `/auth/constants/AuthConstants.ts`
  - 사용자 타입별 권한 매핑 상수
  - 유틸리티 함수

### 데이터베이스
- `user_info`: 사용자 정보 (소셜 로그인 지원)
- `auth_license_user`: 사용자 권한 라이센스
- `auth_main`: 권한 마스터 정보

## 주요 특징

1. **자동 권한 부여**: 회원가입 시 userType에 따라 적절한 권한 자동 부여
2. **자동 로그인**: 회원가입 완료 즉시 토큰 발급 및 세션 생성
3. **중복 방지**: 이메일 중복 체크 및 권한 중복 등록 방지
4. **유연한 확장**: 새로운 OAuth 제공자 추가 용이
5. **완전한 정보 반환**: 로그인/회원가입 시 권한 정보를 포함한 완전한 사용자 정보 반환

## 프론트엔드 구현 가이드

### 1. OAuth 로그인 버튼 클릭
```javascript
const startOAuth = async (provider) => {
  const response = await fetch('/api/auth/oauthToken', {
    method: 'POST',
    body: JSON.stringify({ type: provider })
  });
  const data = await response.json();
  window.location.href = data.url;
};
```

### 2. OAuth 콜백 페이지에서 처리
```javascript
const handleOAuthCallback = async (code, state) => {
  const response = await fetch('/api/auth/loginCheck', {
    method: 'POST',
    body: JSON.stringify({ code, state })
  });

  const data = await response.json();

  if (data.isNewUser) {
    // 회원가입 화면으로 이동 (data.userInfo 정보 전달)
    navigateToRegistration(data);
  } else {
    // 로그인 완료 처리
    saveToken(data.token);
    saveUserInfo(data.loginInfo);
    navigateToHome();
  }
};
```

### 3. 회원가입 폼 제출
```javascript
const completeRegistration = async (formData, oauthData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...formData,
      email: oauthData.userInfo.email,
      name: oauthData.userInfo.name,
      socialId: oauthData.userInfo.socialId,
      provider: oauthData.userInfo.provider,
      state: oauthData.state,
      additionalInfo: {
        username: formData.username,
        company: formData.company
      }
    })
  });

  const data = await response.json();

  if (data.success) {
    // 자동 로그인 완료
    saveToken(data.token);
    saveUserInfo(data.loginInfo);
    showMessage(data.message);
    navigateToHome();
  }
};
```