import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { TodayPage } from '../features/today/TodayPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { LookbackPage } from '../features/lookback/LookbackPage';
import { FragmentDetailPage } from '../features/fragments/FragmentDetailPage';
import { DailyPage } from '../features/days/DailyPage';
import { InvitePage } from '../features/invite/InvitePage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'lookback', element: <LookbackPage /> },
      { path: 'fragments/:id', element: <FragmentDetailPage /> },
      { path: 'days/:dayDate', element: <DailyPage /> },
      { path: 'invite/:token', element: <InvitePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
