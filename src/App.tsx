import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import TeilnehmerPage from '@/pages/TeilnehmerPage';
import KursanmeldungPage from '@/pages/KursanmeldungPage';
import RaeumePage from '@/pages/RaeumePage';
import KursePage from '@/pages/KursePage';
import DozentenPage from '@/pages/DozentenPage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';

export default function App() {
  return (
    <HashRouter>
      <ActionsProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="teilnehmer" element={<TeilnehmerPage />} />
            <Route path="kursanmeldung" element={<KursanmeldungPage />} />
            <Route path="raeume" element={<RaeumePage />} />
            <Route path="kurse" element={<KursePage />} />
            <Route path="dozenten" element={<DozentenPage />} />
            <Route path="anmeldungen" element={<AnmeldungenPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </ActionsProvider>
    </HashRouter>
  );
}
