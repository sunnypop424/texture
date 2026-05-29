import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { runBootReset } from './lib/bootReset';
import { applyTheme, readTheme } from './lib/theme';

// 첫 페인트 전에 테마를 적용해 깜빡임을 막는다.
applyTheme(readTheme());

async function start() {
  // 스토어가 저장소를 읽기 전에 1회성 초기화를 먼저 끝낸다.
  await runBootReset();
  // 초기화가 테마 키를 비웠을 수 있으니 다시 적용.
  applyTheme(readTheme());
  // routes(→ 스토어)는 초기화 이후에 로드되도록 동적 import.
  const { router } = await import('./app/routes');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

void start();
