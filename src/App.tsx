import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import WebTutor from './pages/WebTutor';
import VoiceTutor from './pages/VoiceTutor';
import ApiSettings from './pages/ApiSettings';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/web-tutor" element={<WebTutor />} />
          <Route path="/voice-tutor" element={<VoiceTutor />} />
          <Route path="/api" element={<ApiSettings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
