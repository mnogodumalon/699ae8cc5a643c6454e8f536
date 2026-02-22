import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import KursePage from '@/pages/KursePage';
import TeilnehmerPage from '@/pages/TeilnehmerPage';
import KursanmeldungPage from '@/pages/KursanmeldungPage';
import DozentenPage from '@/pages/DozentenPage';
import RaeumePage from '@/pages/RaeumePage';
import AnmeldungenPage from '@/pages/AnmeldungenPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="kurse" element={<KursePage />} />
          <Route path="teilnehmer" element={<TeilnehmerPage />} />
          <Route path="kursanmeldung" element={<KursanmeldungPage />} />
          <Route path="dozenten" element={<DozentenPage />} />
          <Route path="raeume" element={<RaeumePage />} />
          <Route path="anmeldungen" element={<AnmeldungenPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}