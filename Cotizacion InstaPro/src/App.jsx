import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import FormPage from './pages/FormPage';
import ClientPage from './pages/ClientPage';
import CalibracionPage from './pages/CalibracionPage';
import ReceiptCalibracionPage from './pages/ReceiptCalibracionPage';
import ReceiptFormPage from './pages/ReceiptFormPage';
import ReceiptClientPage from './pages/ReceiptClientPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"                     element={<FormPage />} />
        <Route path="/cotizacion/:encoded"  element={<ClientPage />} />
        <Route path="/recibo"               element={<ReceiptFormPage />} />
        <Route path="/recibo/:encoded"      element={<ReceiptClientPage />} />
        <Route path="/calibrar"             element={<CalibracionPage />} />
        <Route path="/calibrar-recibo"      element={<ReceiptCalibracionPage />} />
        <Route path="*"                     element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
