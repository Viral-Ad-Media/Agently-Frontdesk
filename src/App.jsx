import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import PageNotFound from "./lib/PageNotFound";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Frontdesk from "@/pages/Frontdesk";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/frontdesk" element={<Frontdesk />} />
        <Route path="/aura" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  );
}
