import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import Tasks from './pages/Tasks';
import History from './pages/History';
import Profiles from './pages/Profiles';
import Results from './pages/Results';
import Settings from './pages/Settings';
import DatabasePage from './pages/DatabasePage';
import Conversations from './pages/Conversations';
import ComfyUI from './pages/ComfyUI';
import ComfyUIWorkflows from './pages/ComfyUIWorkflows';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="models" element={<Models />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="history" element={<History />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="results" element={<Results />} />
            <Route path="settings" element={<Settings />} />
            <Route path="database" element={<DatabasePage />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="comfyui" element={<ComfyUI />} />
            <Route path="comfyui-workflows" element={<ComfyUIWorkflows />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
