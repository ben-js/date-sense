# Backend Cursor Rule (커서룰)

## 1. API 설계 원칙
- **RESTful 엔드포인트 사용** (ex: /signup, /login, /user/{id}, /user-preferences)
- **URL은 kebab-case 사용** (소문자 + 하이픈)
  - ✅ 올바른 예: `/user-preferences`, `/matching-requests`, `/points-history`
  - ❌ 잘못된 예: `/userPreferences`, `/matchingRequests`, `/pointsHistory`
- **리소스 중심의 URL 설계**
  - 사용자 관련: `/users/{id}`, `/users/{id}/profile`, `/users/{id}/preferences`
  - 매칭 관련: `/matching/requests`, `/matching/confirm`, `/matching/choices`
  - 리뷰 관련: `/reviews`, `/reviews/{id}`
  - 포인트 관련: `/points/charge`, `/points/history`
- **HTTP 메서드 적절히 사용**
  - GET: 조회, POST: 생성, PUT: 전체 수정, PATCH: 부분 수정, DELETE: 삭제
- 모든 응답은 JSON 형식
- 성공 시 2xx, 실패 시 4xx/5xx 상태코드와 에러 메시지 반환

## 2. 데이터/스키마 규칙
- **백엔드 내부(DB 포함)**: snake_case 사용
  - 예: user_id, created_at, has_profile, preferred_gender 등
- **API 요청 수신**: camelCase → snake_case 변환 후 내부 처리
- **API 응답 전송**: snake_case → camelCase 변환 후 프론트엔드로 반환
- **핸들러/서비스 계층**: 변환 계층 필수 적용
- **테스트/더미 데이터**: snake_case로 작성
- **로그/이벤트**: snake_case 필드명 사용

### API 통신 규칙 (MUST FOLLOW)
- **백엔드 내부(DB 포함)**: snake_case 사용
- **API 요청 수신**: camelCase → snake_case 변환 후 처리
- **API 응답 전송**: snake_case → camelCase 변환 후 반환
- **REST API URL**: kebab-case 사용 (소문자 + 하이픈)
  - ✅ 올바른 예: `/user-preferences`, `/matching-requests`, `/points-history`
  - ❌ 잘못된 예: `/userPreferences`, `/matchingRequests`, `/pointsHistory`
- **쿼리 파라미터**: camelCase 수신 후 snake_case로 변환
  - ✅ 올바른 예: `?sortBy=createdAt&filterBy=active`
  - ❌ 잘못된 예: `?sort_by=created_at&filter_by=active`

### 데이터 변환 책임 분리 (MUST FOLLOW)
- **백엔드 변환 책임**: 
  - API 요청 수신: camelCase → snake_case 변환 후 내부 처리
  - API 응답 전송: snake_case → camelCase 변환 후 반환
  - 쿼리 파라미터: camelCase → snake_case 변환 후 처리
  - `camelToSnakeCase()` / `snakeToCamelCase()` 함수 사용
- **절대 금지**: 
  - 백엔드에서 변환 책임을 소홀히 하는 행위
  - API 요청/응답을 변환하지 않는 행위

### 쿼리 파라미터 처리 예시
```typescript
// 백엔드 핸들러에서 쿼리 파라미터 처리
export const getUsers = async (event: any) => {
  // 쿼리 파라미터를 snake_case로 변환
  const queryParams = event.queryStringParameters || {};
  const snakeCaseParams = camelToSnakeCase(queryParams);
  
  // 예: sortBy=createdAt → sort_by=created_at
  const { sort_by, filter_by, page, limit } = snakeCaseParams;
  
  // 내부 로직 처리...
  
  return {
    statusCode: 200,
    body: JSON.stringify(snakeToCamelCase(result))
  };
};
```

## 3. 목업/더미 데이터
- handler.ts 상단에 메모리 배열로 관리
- 실제 DB 연동 전까지 모든 데이터는 서버 재시작 시 초기화됨

## 4. 인증/세션
- 로그인 성공 시 userId 반환 (JWT 등은 추후 적용)
- 인증이 필요한 API는 추후 미들웨어로 분리

## 5. 프론트엔드 연동 규칙
- CORS 허용 (serverless.yml provider.httpApi.cors: true)
- 프론트엔드에서 필요한 API/데이터 구조는 이 문서에 추가

## 6. 테스트/개발 정책
- serverless offline으로 로컬 개발
- Postman/Insomnia 등으로 API 테스트 권장

## 7. 빌드 데이터 동기화 규칙 (필수)
- **backend/data 폴더의 모든 JSON 파일은 .serverless/build/data와 일치해야 함**
- Serverless Framework는 빌드 시 backend/data의 파일들을 .serverless/build/data로 복사
- 실제 런타임에서는 .serverless/build/data의 파일들이 사용됨
- **데이터 파일 수정 후 반드시 다음 중 하나를 실행:**
  1. `npm run dev` (서버 재시작)
  2. `npm run build` (빌드만 실행)
  3. `npm run sync-data` (Windows) 또는 `npm run sync-data-unix` (Linux/Mac)
  4. 수동으로 .serverless/build/data 파일들 동기화
- **데이터 파일 변경 시 체크리스트:**
  - [ ] backend/data/ 파일 수정
  - [ ] .serverless/build/data/ 파일 동기화
  - [ ] 서버 재시작 또는 빌드 실행
  - [ ] API 테스트로 데이터 확인

## 8. 개발 완료 시 품질 보증 절차 (필수)
- **백엔드 기능 개발/수정이 완료될 때마다 반드시 jest 단위테스트를 실행한다.**
- 테스트 실행 후, 날짜별 로그 파일(`logs/YYYY-MM-DD.json`)을 직접 분석하여
  - 모든 비즈니스 이벤트(회원가입, 로그인, 프로필 저장, 이상형 저장 등)가
  - 로그에 정확히 기록되는지 확인한다.
- 테스트 및 로그 검증이 완료되어야만 PR/배포/운영이 가능하다.
- (자동화 권장) CI 파이프라인에서 테스트 및 로그 검증을 자동화할 것.

### API 개발 체크리스트 (MUST FOLLOW)
- [ ] 백엔드: API 요청 수신 시 camelCase → snake_case 변환
- [ ] 백엔드: API 응답 전송 시 snake_case → camelCase 변환
- [ ] 백엔드: `camelToSnakeCase()` / `snakeToCamelCase()` 함수 사용
- [ ] REST API URL: kebab-case 형식 사용
- [ ] 쿼리 파라미터: camelCase 수신 후 snake_case로 변환
- [ ] 에러 처리 및 로깅 추가

---

## 7. 전체 플로우 및 화면 분기 정책

### 1단계: 회원가입/로그인
- POST /signup: Users, UserStatusHistory 더미데이터에 신규 유저 정보 저장
- POST /login: Users에서 유저 정보 조회, 성공 시 유저 정보 반환

### 2단계: 이상형 프로필 체크 및 분기
- 로그인 성공 후 GET /user-preferences/{userId} 호출
  - 값이 없으면: 이상형 프로필 작성 페이지로 이동
  - 값이 있으면: 홈으로 이동

### 3단계: 이상형 프로필 작성/수정
- POST /user-preferences: userPreferences 더미 데이터에 저장/수정
- 마이페이지에서 "이상형 프로필 수정" 버튼 → 수정화면 진입
- 뒤로가기: 최초 로그인 시엔 로그인화면, 그 외엔 마이페이지로

### 4단계: 프론트엔드 연동 예시
- 회원가입: POST /signup (username, password, name)
- 로그인: POST /login (username, password)
- 이상형 프로필 조회: GET /user-preferences/{userId}
- 이상형 프로필 저장/수정: POST /user-preferences (userId, ...)

---

## [추가/변경 내역]
- 2024-07-03: 전체 플로우 및 화면 분기 정책 추가
- 2024-07-05: REST API URL 설계 원칙 및 데이터/스키마 규칙 상세화 추가
- 2024-07-05: 빌드 데이터 동기화 규칙 추가 (backend/data ↔ .serverless/build/data)

# 백엔드 로그 설계 및 운영 정책 (커서룰)

## 1. 로그 파일 구조 및 저장 정책
- **로그는 날짜별로 분리된 파일(`logs_YYYY-MM-DD.json`)에 저장한다.**
- 각 로그 파일은 JSON Lines(한 줄에 한 개의 JSON 객체) 또는 배열(JSON array) 형태로 저장한다.
- 로그 파일 위치: `backend/data/logs/YYYY-MM-DD.json` (예: `logs/2024-06-07.json`)
- 로그 파일이 없으면 자동 생성한다.

## 2. 로그 스키마(구조)
```json
{
  "type": "login",           // 이벤트 종류
  "userId": "user-1",        // 사용자 고유 ID
  "email": "test@test.com",  // 이메일
  "ip": "192.168.0.1",       // 요청자 IP
  "result": "success",        // 성공/실패 등 결과
  "message": "",              // 에러/상세 메시지
  "detail": { ... },           // 부가 정보(프로필, 이상형 등)
  "date": "2024-06-07T12:34:56.789Z" // ISO 날짜/시간
}
```
- **필수 필드**: type, userId, email, ip, result, date
- **확장 필드**: message, detail 등

## 3. 확장성/고급 설계 패턴
- **단일 appendLog 함수에서 날짜별 파일 자동 분기**
- 로그 스키마는 반드시 구조화(스키마화)하여, 필드 추가/변경이 쉬워야 함
- 로그 기록은 비동기(가능하면), 장애 발생 시에도 최대한 유실 없이 기록
- 로그 파일은 일정 기간(예: 30일) 후 자동 보관/삭제 정책 적용 가능
- 운영 환경에서는 외부 로그 시스템(ELK, CloudWatch 등) 연동 고려
- 로그 기록 실패 시 서비스 장애로 이어지지 않도록 예외 처리

## 4. 예시 코드 (핵심 부분)
```ts
function appendLog({ type, userId = '', email = '', ip = '', result = '', message = '', detail = {} }) {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const logDir = path.join(__dirname, 'data/logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${dateStr}.json`);
  let logs = [];
  try {
    logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf-8')) : [];
  } catch (e) { logs = []; }
  logs.push({ type, userId, email, ip, result, message, detail, date: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}
```

## 5. 고급 개발자 관점 Best Practice
- **로그는 서비스의 생명선**: 장애, 보안, 고객문의, 통계 등 모든 운영의 근간
- **구조화된 로그**: 단순 텍스트가 아닌, JSON 등 파싱/검색/집계가 쉬운 구조로
- **날짜별 분리**: 대용량/운영/보관/분석 효율성 극대화
- **확장성**: 신규 이벤트/필드 추가가 쉬운 구조, 외부 시스템 연동 고려
- **예외 안전성**: 로그 기록 실패가 서비스 장애로 이어지지 않도록 try-catch 처리
- **보안/개인정보**: 민감 정보는 마스킹/비식별화, 접근 권한 관리

---

> 이 정책은 모든 백엔드 개발자가 반드시 준수해야 하며, 신규/기존 기능 개발 시 로그 설계/운영 정책을 항상 반영해야 한다. 

## 7. 디렉토리/파일 관리 원칙
- **data/**, 소스코드, 테스트, 정책문서, 설정파일만 직접 관리한다.
- **.serverless/**, **build/**, **node_modules/** 등 빌드/의존성 산출물은 직접 관리/수정/삭제하지 않는다.
- **.gitignore**에 빌드 산출물, 의존성 폴더, 임시파일 등을 반드시 추가한다.
- 오래된 임시/테스트 파일 등은 주기적으로 정리한다.
- 실제 서비스/개발에 필요한 파일만 유지하여, 운영/협업/배포의 효율성을 높인다.

---

## 8. 비즈니스 로그 NoSQL DB 설계/운영 정책
- AWS Lambda 환경에서는 파일 로그 대신 NoSQL DB(운영: DynamoDB, 로컬: lowdb 등)에 로그를 저장한다.
- 로그 테이블(컬렉션) 스키마 예시:
  - logId (PK, UUID)
  - type (이벤트 종류)
  - userId
  - email
  - ip
  - result
  - message
  - detail (JSON)
  - date (ISO8601)
- 모든 비즈니스 이벤트(회원가입, 로그인, 프로필 저장, 이상형 저장 등)는 반드시 로그 DB에 기록한다.
- 운영 환경에서는 DynamoDB, 로컬 개발/테스트에서는 lowdb(json 기반) 등으로 대체 구현 가능
- 로그 DB는 검색/분석/감사/고객문의 대응에 활용한다.
- 로그 기록 실패 시 서비스 장애로 이어지지 않도록 예외 처리
- (운영 자동화) 로그 DB의 데이터는 주기적으로 S3/Redshift 등으로 ETL/백업 가능

--- 