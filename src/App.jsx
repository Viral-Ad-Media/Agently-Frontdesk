import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import PageNotFound from "./lib/PageNotFound";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Frontdesk from "@/pages/Frontdesk";
import ClaimPack from "@/pages/ClaimPack";
import Setup from "@/pages/Setup";
import Product from "@/pages/Product";
import Eval from "@/pages/Eval";
import Alerts from "@/pages/Alerts";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Product />} />
        <Route path="/site" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/frontdesk" element={<Frontdesk />} />
        <Route path="/claim/:id" element={<ClaimPack />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/eval" element={<Eval />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/aura" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  );
}
