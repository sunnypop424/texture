import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 결(Gyeol) — Capacitor (APK 패키징).
 * React 웹(Vite) 빌드 결과(dist)를 APK에 동봉한다. 기기 ↔ Supabase 직접 통신,
 * 별도 웹 호스팅 없음.
 *
 * 빌드:
 *   npm run build            # dist/ 생성
 *   npx cap add android      # 최초 1회 — android/ 프로젝트 생성
 *   npm run cap:sync         # dist + 플러그인을 네이티브로 동기화
 *   npx cap open android     # Android Studio에서 열어 APK 빌드/실행
 */
const config: CapacitorConfig = {
  appId: 'app.gyeol',
  appName: '결',
  webDir: 'dist',
};

export default config;
