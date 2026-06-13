import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ipc } from './lib/ipc';
import { Layout } from './components/Layout';
import { SetupWizard } from './routes/SetupWizard';
import { ClientManagement } from './routes/ClientManagement';
import { SendHistory } from './routes/SendHistory';
import { TemplateManagement } from './routes/TemplateManagement';
import { Settings } from './routes/Settings';


export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function checkConfig() {
      try {
        const hasCredentials = await ipc.getAppConfig();
        if (!hasCredentials && location.pathname !== '/setup') {
          navigate('/setup', { replace: true });
        } else if (hasCredentials && location.pathname === '/setup') {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Failed to get app config', err);
      } finally {
        setIsInitializing(false);
      }
    }
    
    checkConfig();
  }, [navigate, location.pathname]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />
      <Route element={<Layout />}>
        <Route path="/" element={<ClientManagement />} />
        <Route path="/history" element={<SendHistory />} />
        <Route path="/templates" element={<TemplateManagement />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
